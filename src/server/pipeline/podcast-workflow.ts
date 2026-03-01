import { db } from "~/server/db"
import { podcasts, podcastCharacters, podcastSegments, characters, books } from "~/server/db/schema"
import { eq } from "drizzle-orm"
import { parseEpub } from "./epub-parser"
import { generateScript } from "./script-generator"
import { ensureVoiceForCharacter } from "./voice-cloner"
import { generateSegmentAudio } from "./audio-generator"
import { combineAudio } from "./audio-combiner"
import type { Chapter } from "./types"

export async function podcastWorkflow(podcastId: number) {
  try {
    // Load podcast + characters from DB
    const podcast = await db.query.podcasts.findFirst({ 
      where: eq(podcasts.id, podcastId) 
    })
    
    if (!podcast) {
      throw new Error(`Podcast ${podcastId} not found`)
    }
    
    const pcRows = await db.query.podcastCharacters.findMany({ 
      where: eq(podcastCharacters.podcastId, podcastId) 
    })
    
    const charRows = await Promise.all(
      pcRows.map(async (pc) => {
        const char = await db.query.characters.findFirst({
          where: eq(characters.id, pc.characterId),
        })
        return {
          id: char!.id,
          name: char!.name,
          personality: char!.personality,
          speakingStyle: char!.speakingStyle,
          speakingQuirks: char!.speakingQuirks,
          role: pc.role,
          modifier: pc.modifier,
        }
      })
    )
    
    // Load chapter text from stored chaptersJson
    const book = await db.query.books.findFirst({ 
      where: eq(books.id, podcast.bookId) 
    })
    
    if (!book) {
      throw new Error(`Book ${podcast.bookId} not found`)
    }
    
    const chapters = JSON.parse(book.chaptersJson) as Chapter[]
    const chapter = chapters.find(c => c.index === podcast.chapterIndex)
    
    if (!chapter) {
      throw new Error(`Chapter ${podcast.chapterIndex} not found`)
    }
    
    const documentText = chapter.text
    
    // Step 1: Generate script with Mistral
    await updateStatus(podcastId, "scripting", 15)
    const script = await generateScript({ 
      documentText, 
      characters: charRows, 
      format: podcast.format as any, 
      title: podcast.title 
    })
    await db.update(podcasts)
      .set({ scriptJson: JSON.stringify(script) })
      .where(eq(podcasts.id, podcastId))
    
    // Step 2: Clone voices for each character
    await updateStatus(podcastId, "generating_voices", 25)
    const voiceMap = new Map<string, string>()
    for (const c of charRows) {
      const voiceId = await ensureVoiceForCharacter(c.id)
      voiceMap.set(c.name, voiceId)
    }
    
    // Step 3: Generate audio per segment
    await updateStatus(podcastId, "generating_audio", 30)
    const segmentPaths: string[] = []
    for (let i = 0; i < script.segments.length; i++) {
      const seg = script.segments[i]!
      const character = charRows.find(c => c.name === seg.speakerName)
      
      if (!character) {
        console.error(`Character ${seg.speakerName} not found`)
        continue
      }
      
      const [row] = await db.insert(podcastSegments).values({ 
        podcastId, 
        characterId: character.id, 
        orderIndex: i, 
        text: seg.text, 
        emotion: seg.emotion ?? null, 
        status: "generating" 
      }).returning()
      
      const voiceId = voiceMap.get(seg.speakerName)!
      const { filePath, durationMs } = await generateSegmentAudio({ 
        voiceId, 
        text: seg.text, 
        segmentId: row!.id, 
        podcastId 
      })
      
      await db.update(podcastSegments)
        .set({ audioFilePath: filePath, durationMs, status: "completed" })
        .where(eq(podcastSegments.id, row!.id))
      
      segmentPaths.push(filePath)
      const progress = 30 + Math.round((i / script.segments.length) * 60)
      await updateStatus(podcastId, "generating_audio", progress)
    }
    
    // Step 4: Combine audio with ffmpeg
    await updateStatus(podcastId, "combining", 92)
    const { outputPath, durationSeconds } = await combineAudio({ 
      segmentPaths, 
      podcastId, 
      title: podcast.title 
    })
    
    // Done
    await db.update(podcasts)
      .set({ 
        status: "completed", 
        progress: 100, 
        outputFilePath: outputPath, 
        durationSeconds 
      })
      .where(eq(podcasts.id, podcastId))
      
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await db.update(podcasts)
      .set({ 
        status: "failed", 
        errorMessage 
      })
      .where(eq(podcasts.id, podcastId))
    throw error
  }
}

async function updateStatus(podcastId: number, status: string, progress: number) {
  await db.update(podcasts)
    .set({ status, progress })
    .where(eq(podcasts.id, podcastId))
}

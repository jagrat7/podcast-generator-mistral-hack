import { db } from "~/server/db";
import {
  podcasts,
  podcastCharacters,
  podcastSegments,
  characters,
  books,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { parseEpub } from "./epub-parser";
import { generateScript } from "./script-generator";
import { ensureVoiceForCharacter } from "./voice-cloner";
import { generateSegmentAudio } from "./audio-generator";
import { combineAudio } from "./audio-combiner";
import type { Chapter, ScriptSegment } from "./types";

function matchAllWords(dbName: string, speakerName: string): boolean {
  const dbWords = dbName.toLowerCase().split(/\s+/)
  const speakerWords = speakerName.toLowerCase().split(/\s+/)
  return dbWords.every((w) => speakerWords.includes(w))
}

export async function podcastWorkflow(podcastId: number) {
  console.log(`[workflow] Starting podcast ${podcastId}`)
  try {
    // Load podcast + characters from DB
    const podcast = await db.query.podcasts.findFirst({
      where: eq(podcasts.id, podcastId),
    });

    if (!podcast) {
      throw new Error(`Podcast ${podcastId} not found`);
    }

    console.log(`[workflow] Podcast "${podcast.title}" - bookId: ${podcast.bookId}, chapter: ${podcast.chapterIndex}`)

    const pcRows = await db.query.podcastCharacters.findMany({
      where: eq(podcastCharacters.podcastId, podcastId),
    });

    console.log(`[workflow] Found ${pcRows.length} podcast-character associations`)

    const charRows = await Promise.all(
      pcRows.map(async (pc) => {
        const char = await db.query.characters.findFirst({
          where: eq(characters.id, pc.characterId),
        });
        console.log(`[workflow] Character ${pc.characterId}: "${char?.name}" - hasVoiceId: ${!!char?.elevenLabsVoiceId}, hasSamples: ${!!char?.audioSamplesJson}`)
        return {
          id: char!.id,
          name: char!.name,
          personality: char!.personality,
          speakingStyle: char!.speakingStyle,
          speakingQuirks: char!.speakingQuirks,
          role: pc.role,
          modifier: pc.modifier,
        };
      }),
    );

    // Load chapter text from stored chaptersJson
    const book = await db.query.books.findFirst({
      where: eq(books.id, podcast.bookId),
    });

    if (!book) {
      throw new Error(`Book ${podcast.bookId} not found`);
    }

    const chapters = JSON.parse(book.chaptersJson) as Chapter[];
    const chapter = chapters.find((c) => c.index === podcast.chapterIndex);

    if (!chapter) {
      throw new Error(`Chapter ${podcast.chapterIndex} not found`);
    }

    const documentText = chapter.text;
    console.log(`[workflow] Chapter text length: ${documentText.length} chars`)
    console.log(`[workflow] Chapter text preview: "${documentText.slice(0, 200)}..."`)

    // Step 1: Generate script with Mistral
    console.log(`[workflow] Step 1: Generating script with Mistral...`)
    await updateStatus(podcastId, "scripting", 15);
    const script = await generateScript({
      documentText,
      characters: charRows,
      format: podcast.format as any,
      title: podcast.title,
    });
    console.log(`[workflow] Script generated: ${script.segments.length} segments`)
    console.log(`[workflow] Speakers in script:`, [...new Set(script.segments.map(s => s.speakerName))])
    await db
      .update(podcasts)
      .set({ scriptJson: JSON.stringify(script) })
      .where(eq(podcasts.id, podcastId));

    // Step 2: Clone voices for each character
    console.log(`[workflow] Step 2: Cloning voices for ${charRows.length} characters...`)
    await updateStatus(podcastId, "generating_voices", 25);
    const voiceMap = new Map<string, string>();
    for (const c of charRows) {
      console.log(`[workflow] Ensuring voice for character ${c.id} (${c.name})...`)
      const voiceId = await ensureVoiceForCharacter(c.id);
      console.log(`[workflow] Got voiceId: ${voiceId} for ${c.name}`)
      voiceMap.set(c.name, voiceId);
    }
    console.log(`[workflow] Voice map complete:`, Object.fromEntries(voiceMap))

    // Build a lookup map: lowercase name -> character row
    const charLookup = new Map<string, (typeof charRows)[0]>();
    for (const c of charRows) {
      charLookup.set(c.name.toLowerCase(), c);
    }

    // Step 3: Generate audio per segment
    await updateStatus(podcastId, "generating_audio", 30);
    const segmentPaths: string[] = [];
    for (let i = 0; i < script.segments.length; i++) {
      const seg = script.segments[i] as ScriptSegment
      const speakerLower = seg.speakerName.toLowerCase()
      // Try exact match first, then fuzzy strategies
      const character =
        charLookup.get(speakerLower) ??
        charRows.find((c) => c.name.toLowerCase().startsWith(speakerLower)) ??
        charRows.find((c) => speakerLower.startsWith(c.name.toLowerCase())) ??
        charRows.find((c) => c.name.toLowerCase().includes(speakerLower) || speakerLower.includes(c.name.toLowerCase())) ??
        // Handle Mistral adding middle names: check if all words in DB name appear in speaker name
        charRows.find((c) => matchAllWords(c.name, speakerLower))

      if (!character) {
        console.error(`Character ${seg.speakerName} not found`);
        continue;
      }

      const [row] = await db
        .insert(podcastSegments)
        .values({
          podcastId,
          characterId: character.id,
          orderIndex: i,
          text: seg.text,
          emotion: seg.emotion ?? null,
          status: "generating",
        })
        .returning();

      const voiceId = voiceMap.get(character.name)!;
      
      try {
        const { filePath, durationMs, newVoiceId } = await generateSegmentAudio({
          voiceId,
          text: seg.text,
          segmentId: row!.id,
          podcastId,
          characterId: character.id,
        });

        // If TTS had to use a fallback voice, update the cache
        if (newVoiceId) {
          console.log(`[workflow] Updating cached voice for ${character.name} from ${voiceId} to ${newVoiceId}`)
          await db
            .update(characters)
            .set({ elevenLabsVoiceId: newVoiceId })
            .where(eq(characters.id, character.id))
          voiceMap.set(character.name, newVoiceId)
        }

        await db
          .update(podcastSegments)
          .set({ audioFilePath: filePath, durationMs, status: "completed" })
          .where(eq(podcastSegments.id, row!.id));

        segmentPaths.push(filePath);
        console.log(`[workflow] Segment ${i + 1}/${script.segments.length} completed: ${filePath}`)
      } catch (segmentError) {
        console.error(`[workflow] Failed to generate audio for segment ${i}:`, segmentError)
        // Mark segment as failed but continue with others
        await db
          .update(podcastSegments)
          .set({ status: "failed" })
          .where(eq(podcastSegments.id, row!.id))
      }
      const progress = 30 + Math.round((i / script.segments.length) * 60);
      await updateStatus(podcastId, "generating_audio", progress);
    }

    // Step 4: Combine audio with ffmpeg
    if (segmentPaths.length === 0) {
      throw new Error("No audio segments were generated. Check character names and voice configuration.");
    }
    await updateStatus(podcastId, "combining", 92);
    const { outputPath, durationSeconds } = await combineAudio({
      segmentPaths,
      podcastId,
      title: podcast.title,
    });

    // Done
    await db
      .update(podcasts)
      .set({
        status: "completed",
        progress: 100,
        outputFilePath: outputPath,
        durationSeconds,
      })
      .where(eq(podcasts.id, podcastId));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await db
      .update(podcasts)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(podcasts.id, podcastId));
    throw error;
  }
}

async function updateStatus(
  podcastId: number,
  status: string,
  progress: number,
) {
  await db
    .update(podcasts)
    .set({ status, progress })
    .where(eq(podcasts.id, podcastId));
}

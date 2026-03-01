import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { nanoid } from "nanoid"
import { db } from "~/server/db"
import { characters } from "~/server/db/schema"
import { eq } from "drizzle-orm"
import { VOICE_SAMPLES_DIR } from "~/lib/constants"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const characterId = formData.get("characterId") as string
    const files = formData.getAll("files") as File[]
    
    if (!characterId || !files.length) {
      return NextResponse.json(
        { error: "Character ID and files are required" },
        { status: 400 }
      )
    }
    
    const charId = parseInt(characterId, 10)
    
    // Get character
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, charId),
    })
    
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 })
    }
    
    // Create character voice samples directory
    const charDir = path.join(VOICE_SAMPLES_DIR, characterId)
    await mkdir(charDir, { recursive: true })
    
    // Get existing samples
    const existingSamples = character.audioSamplesJson
      ? (JSON.parse(character.audioSamplesJson) as string[])
      : []
    
    // Save new files
    const newSamplePaths: string[] = []
    for (const file of files) {
      // Validate file type
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!["mp3", "wav", "m4a"].includes(ext ?? "")) {
        continue
      }
      
      const fileName = `${nanoid(10)}.${ext}`
      const filePath = path.join(charDir, fileName)
      
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      await writeFile(filePath, buffer)
      newSamplePaths.push(filePath)
    }
    
    // Update character with new samples and clear voice ID
    const allSamples = [...existingSamples, ...newSamplePaths]
    
    await db.update(characters)
      .set({
        audioSamplesJson: JSON.stringify(allSamples),
        elevenLabsVoiceId: null, // Clear cached voice
      })
      .where(eq(characters.id, charId))
    
    return NextResponse.json({
      sampleCount: allSamples.length,
    })
  } catch (error) {
    console.error("Voice sample upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}

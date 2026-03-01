import fs from "fs/promises"
import { elevenlabs } from "~/lib/elevenlabs"
import { db } from "~/server/db"
import { characters } from "~/server/db/schema"
import { eq } from "drizzle-orm"

export async function ensureVoiceForCharacter(characterId: number): Promise<string> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
  })
  
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }
  
  // Return cached voice if available
  if (character.elevenLabsVoiceId) {
    return character.elevenLabsVoiceId
  }
  
  // Check if audio samples exist
  if (!character.audioSamplesJson) {
    throw new Error(`Character ${character.name} has no audio samples uploaded`)
  }
  
  const audioSamplePaths = JSON.parse(character.audioSamplesJson) as string[]
  
  if (audioSamplePaths.length === 0) {
    throw new Error(`Character ${character.name} has no audio samples`)
  }
  
  // Read audio files and convert to Blobs
  const audioFiles: Blob[] = []
  for (const path of audioSamplePaths) {
    const buffer = await fs.readFile(path)
    const blob = new Blob([buffer], { type: "audio/mpeg" })
    audioFiles.push(blob)
  }
  
  // Clone voice using ElevenLabs
  const voice = await elevenlabs.voices.add({
    name: `${character.name} - ${Date.now()}`,
    files: audioFiles,
  })
  
  // Cache the voice ID
  await db.update(characters)
    .set({ elevenLabsVoiceId: voice.voice_id })
    .where(eq(characters.id, characterId))
  
  return voice.voice_id
}

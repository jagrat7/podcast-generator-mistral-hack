import fs from "fs/promises";
import { elevenlabs } from "~/lib/elevenlabs";
import { db } from "~/server/db";
import { characters } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function ensureVoiceForCharacter(
  characterId: number,
): Promise<string> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
  });

  if (!character) {
    throw new Error(`Character ${characterId} not found`);
  }

  // Return cached voice if available AND still exists on ElevenLabs
  if (character.elevenLabsVoiceId) {
    try {
      await elevenlabs.voices.get(character.elevenLabsVoiceId)
      return character.elevenLabsVoiceId
    } catch {
      // Voice was deleted on ElevenLabs side, clear cache and re-clone below
      await db
        .update(characters)
        .set({ elevenLabsVoiceId: null })
        .where(eq(characters.id, characterId))
    }
  }

  // Require audio samples for voice cloning
  if (!character.audioSamplesJson) {
    throw new Error(
      `Character "${character.name}" has no audio samples uploaded. Please upload voice samples before generating a podcast.`,
    );
  }

  const audioSamplePaths = JSON.parse(character.audioSamplesJson) as string[];

  if (audioSamplePaths.length === 0) {
    throw new Error(
      `Character "${character.name}" has no audio samples. Please upload voice samples before generating a podcast.`,
    );
  }

  // Read audio files and convert to Blobs
  const audioFiles: Blob[] = [];
  for (const samplePath of audioSamplePaths) {
    const buffer = await fs.readFile(samplePath);
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    audioFiles.push(blob);
  }

  // Clone voice using ElevenLabs
  let voice
  try {
    voice = await elevenlabs.voices.add({
      name: `${character.name} - ${Date.now()}`,
      files: audioFiles,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error && (error as Record<string, unknown>).statusCode === 403) {
      throw new Error(
        `ElevenLabs voice cloning requires a paid plan. Your current API key does not have Instant Voice Cloning access. Upgrade at https://elevenlabs.io/subscription`,
      )
    }
    throw error
  }

  // Cache the voice ID so we don't clone again
  await db
    .update(characters)
    .set({ elevenLabsVoiceId: voice.voice_id })
    .where(eq(characters.id, characterId));

  return voice.voice_id;
}

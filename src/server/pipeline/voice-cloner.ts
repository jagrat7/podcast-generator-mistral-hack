import fs from "fs/promises";
import { elevenlabs } from "~/lib/elevenlabs";
import { db } from "~/server/db";
import { characters } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Pre-made ElevenLabs voices for fallback (when cloning fails)
// These are free-tier voices that can approximate different character types
const FALLBACK_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", style: "calm, professional female" },
  { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", style: "deep, confident male" },
  { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde", style: "warm, conversational male" },
  { id: "5Q0t7uMcjvnagumLfvZi", name: "Paul", style: "authoritative male" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", style: "bold, energetic female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", style: "friendly, warm female" },
  { id: "FGY2WhQpF6gWgQhXEB7h", style: "mature, thoughtful male" },
  { id: "IKne3meq5uSnSbOjLQPx", style: "energetic, youthful male" },
  { id: "LcfcDJNUP1fpXcE1Qha4", style: "soft, gentle female" },
  { id: "TxGEqnHWuWBYvhYBojMR", style: "dramatic, expressive male" },
]

let fallbackIndex = 0

function getNextFallbackVoice(): string {
  const voice = FALLBACK_VOICES[fallbackIndex % FALLBACK_VOICES.length]!
  fallbackIndex++
  console.log(`[voice-cloner] Using fallback voice: ${voice.name} (${voice.style})`)
  return voice.id
}

export async function ensureVoiceForCharacter(
  characterId: number,
): Promise<string> {
  console.log(`[voice-cloner] Starting for character ${characterId}`)
  
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
  });

  if (!character) {
    console.error(`[voice-cloner] Character ${characterId} not found in DB`)
    throw new Error(`Character ${characterId} not found`);
  }

  console.log(`[voice-cloner] Character "${character.name}" - hasVoiceId: ${!!character.elevenLabsVoiceId}, hasSamples: ${!!character.audioSamplesJson}`)

  // Return cached voice if available AND still exists on ElevenLabs
  if (character.elevenLabsVoiceId) {
    console.log(`[voice-cloner] Checking cached voice ${character.elevenLabsVoiceId} on ElevenLabs...`)
    try {
      await elevenlabs.voices.get(character.elevenLabsVoiceId)
      console.log(`[voice-cloner] Cached voice exists, returning ${character.elevenLabsVoiceId}`)
      return character.elevenLabsVoiceId
    } catch (err) {
      console.log(`[voice-cloner] Cached voice not found on ElevenLabs, will re-clone. Error:`, err)
      // Voice was deleted on ElevenLabs side, clear cache and re-clone below
      await db
        .update(characters)
        .set({ elevenLabsVoiceId: null })
        .where(eq(characters.id, characterId))
    }
  }

  // If no audio samples, use fallback voice
  if (!character.audioSamplesJson) {
    console.log(`[voice-cloner] No audio samples for "${character.name}", using fallback voice`)
    const voiceId = getNextFallbackVoice()
    await db
      .update(characters)
      .set({ elevenLabsVoiceId: voiceId })
      .where(eq(characters.id, characterId))
    return voiceId
  }

  const audioSamplePaths = JSON.parse(character.audioSamplesJson) as string[];
  console.log(`[voice-cloner] Found ${audioSamplePaths.length} audio sample paths`)

  if (audioSamplePaths.length === 0) {
    console.log(`[voice-cloner] Empty audio samples for "${character.name}", using fallback voice`)
    const voiceId = getNextFallbackVoice()
    await db
      .update(characters)
      .set({ elevenLabsVoiceId: voiceId })
      .where(eq(characters.id, characterId))
    return voiceId
  }

  // Read audio files and convert to Blobs
  console.log(`[voice-cloner] Reading audio files from disk...`)
  const audioFiles: Blob[] = [];
  for (const samplePath of audioSamplePaths) {
    console.log(`[voice-cloner] Reading: ${samplePath}`)
    const buffer = await fs.readFile(samplePath);
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    audioFiles.push(blob);
  }
  console.log(`[voice-cloner] Read ${audioFiles.length} audio files, calling ElevenLabs clone API...`)

  // Clone voice using ElevenLabs, fall back to premade voice on failure
  let voice
  try {
    voice = await elevenlabs.voices.add({
      name: `${character.name} - ${Date.now()}`,
      files: audioFiles,
    })
    console.log(`[voice-cloner] Clone successful! voice_id: ${voice.voice_id}`)
  } catch (error: unknown) {
    console.error(`[voice-cloner] ElevenLabs clone failed for "${character.name}"`)
    console.error(`[voice-cloner] Error:`, error)
    console.log(`[voice-cloner] Falling back to premade voice for "${character.name}"`)
    
    const voiceId = getNextFallbackVoice()
    await db
      .update(characters)
      .set({ elevenLabsVoiceId: voiceId })
      .where(eq(characters.id, characterId))
    return voiceId
  }

  // Cache the voice ID so we don't clone again
  await db
    .update(characters)
    .set({ elevenLabsVoiceId: voice.voice_id })
    .where(eq(characters.id, characterId));

  return voice.voice_id;
}

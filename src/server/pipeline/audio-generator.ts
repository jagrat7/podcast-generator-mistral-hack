import fs from "fs/promises";
import path from "path";
import { elevenlabs } from "~/lib/elevenlabs";
import { SEGMENTS_DIR } from "~/lib/constants";

// Fallback voices for when a voice ID is blocked (celebrity clones)
const FALLBACK_VOICES = [
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "29vD33N1CtxCmqQRPOHJ", // Drew
  "2EiwWnXFnvU5JabPnv8n", // Clyde
  "5Q0t7uMcjvnagumLfvZi", // Paul
  "AZnzlk1XvdvUeBnXmlld", // Domi
  "EXAVITQu4vr4xnSDxMaL", // Bella
]

interface GenerateSegmentInput {
  voiceId: string;
  text: string;
  segmentId: number;
  podcastId: number;
  characterId: number;
}

export async function generateSegmentAudio(
  input: GenerateSegmentInput,
): Promise<{ filePath: string; durationMs: number; newVoiceId?: string }> {
  const { voiceId, text, segmentId, podcastId, characterId } = input;

  // Create podcast segments directory
  const podcastSegmentsDir = path.join(SEGMENTS_DIR, podcastId.toString());
  await fs.mkdir(podcastSegmentsDir, { recursive: true });

  const filePath = path.join(podcastSegmentsDir, `segment-${segmentId}.mp3`);

  // Try TTS with the provided voice, fall back if blocked
  let activeVoiceId = voiceId
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    try {
      console.log(`[audio-generator] Attempting TTS with voice ${activeVoiceId} for segment ${segmentId}...`)
      console.log(`[audio-generator] Text: "${text.slice(0, 50)}..."`)
      
      // Generate audio using ElevenLabs TTS
      const audio = await elevenlabs.textToSpeech.convert(activeVoiceId, {
        text,
        model_id: "eleven_multilingual_v2",
      });

      // Write audio stream to file
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      await fs.writeFile(filePath, buffer);
      console.log(`[audio-generator] Successfully wrote ${buffer.length} bytes to ${filePath}`)

      // Estimate duration (rough estimate: ~150 words/minute, ~5 chars/word)
      const estimatedDurationMs = Math.ceil((text.length / 5) * (60000 / 150));

      // If we used a fallback voice, return it so the caller can update the cache
      const result: { filePath: string; durationMs: number; newVoiceId?: string } = {
        filePath,
        durationMs: estimatedDurationMs,
      }
      
      if (activeVoiceId !== voiceId) {
        result.newVoiceId = activeVoiceId
        console.log(`[audio-generator] TTS succeeded with fallback voice ${activeVoiceId}, returning for cache update`)
      }
      
      return result
    } catch (error: unknown) {
      console.error(`[audio-generator] TTS failed for segment ${segmentId}`)
      console.error(`[audio-generator] Error:`, error)
      
      // Check for various error formats
      const errorObj = error as Record<string, unknown>
      const statusCode = errorObj?.statusCode ?? errorObj?.status ?? (errorObj as { response?: { status?: number } }).response?.status
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Handle rate limits, blocked voices, and other retryable errors
      if (statusCode === 403 || statusCode === 401 || statusCode === 429 || errorMessage.includes('rate') || errorMessage.includes('limit')) {
        attempts++
        console.error(`[audio-generator] Voice ${activeVoiceId} blocked/rate-limited (${statusCode}), falling back (attempt ${attempts}/${maxAttempts})...`)
        
        // Use a fallback voice based on character ID for consistency
        const fallbackIndex = characterId % FALLBACK_VOICES.length
        activeVoiceId = FALLBACK_VOICES[fallbackIndex]!
        
        // Add a small delay for rate limiting
        if (statusCode === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } else {
        console.error(`[audio-generator] Non-retryable error, rethrowing`)
        throw error
      }
    }
  }

  // Fallback: just use the last attempted voice
  console.error(`[audio-generator] Max attempts reached, returning last fallback voice ${activeVoiceId}`)
  return {
    filePath,
    durationMs: Math.ceil((text.length / 5) * (60000 / 150)),
    newVoiceId: activeVoiceId,
  }
}

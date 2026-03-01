import fs from "fs/promises"
import path from "path"
import { elevenlabs } from "~/lib/elevenlabs"
import { SEGMENTS_DIR } from "~/lib/constants"

interface GenerateSegmentInput {
  voiceId: string
  text: string
  segmentId: number
  podcastId: number
}

export async function generateSegmentAudio(input: GenerateSegmentInput): Promise<{ filePath: string; durationMs: number }> {
  const { voiceId, text, segmentId, podcastId } = input
  
  // Create podcast segments directory
  const podcastSegmentsDir = path.join(SEGMENTS_DIR, podcastId.toString())
  await fs.mkdir(podcastSegmentsDir, { recursive: true })
  
  const filePath = path.join(podcastSegmentsDir, `segment-${segmentId}.mp3`)
  
  // Generate audio using ElevenLabs TTS
  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_multilingual_v2",
  })
  
  // Write audio stream to file
  const chunks: Buffer[] = []
  for await (const chunk of audio) {
    chunks.push(chunk)
  }
  
  const buffer = Buffer.concat(chunks)
  await fs.writeFile(filePath, buffer)
  
  // Estimate duration (rough estimate: ~150 words/minute, ~5 chars/word)
  const estimatedDurationMs = Math.ceil((text.length / 5) * (60000 / 150))
  
  return { filePath, durationMs: estimatedDurationMs }
}

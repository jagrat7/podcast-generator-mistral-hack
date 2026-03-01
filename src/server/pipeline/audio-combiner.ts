import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { nanoid } from "nanoid"
import { OUTPUT_DIR } from "~/lib/constants"

const execAsync = promisify(exec)

interface CombineAudioInput {
  segmentPaths: string[]
  podcastId: number
  title: string
}

export async function combineAudio(input: CombineAudioInput): Promise<{ outputPath: string; durationSeconds: number }> {
  const { segmentPaths, podcastId } = input
  
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  
  const outputFilename = `${podcastId}-${nanoid(10)}.mp3`
  const outputPath = path.join(OUTPUT_DIR, outputFilename)
  
  // Create concat file list for ffmpeg
  const concatListPath = path.join(OUTPUT_DIR, `concat-${podcastId}.txt`)
  const concatContent = segmentPaths.map(p => `file '${path.resolve(p)}'`).join("\n")
  await fs.writeFile(concatListPath, concatContent)
  
  // Combine audio with ffmpeg
  const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -af "loudnorm,afade=t=in:d=0.5,afade=t=out:st=0:d=0.5" -c:a libmp3lame -b:a 128k "${outputPath}"`
  
  await execAsync(ffmpegCommand)
  
  // Get duration using ffprobe
  const ffprobeCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
  const { stdout } = await execAsync(ffprobeCommand)
  const durationSeconds = Math.ceil(parseFloat(stdout.trim()))
  
  // Clean up concat file
  await fs.unlink(concatListPath).catch(() => {})
  
  return { outputPath, durationSeconds }
}

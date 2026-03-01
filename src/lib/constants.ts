export const PODCAST_FORMATS = ["interview","debate","storytelling","educational","comedy","roundtable"] as const
export type PodcastFormat = (typeof PODCAST_FORMATS)[number]

export const UPLOADS_DIR = "storage/uploads"
export const VOICE_SAMPLES_DIR = "storage/voice-samples"
export const SEGMENTS_DIR = "storage/segments"
export const OUTPUT_DIR = "storage/output"

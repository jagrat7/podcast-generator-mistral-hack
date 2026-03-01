import { z } from "zod";

export const scriptSegmentSchema = z.object({
  speakerName: z.string(),
  text: z.string(),
  emotion: z.string().optional(),
});

export const podcastScriptSchema = z.object({
  title: z.string(),
  segments: z.array(scriptSegmentSchema),
});

export type ScriptSegment = z.infer<typeof scriptSegmentSchema>;
export type PodcastScript = z.infer<typeof podcastScriptSchema>;

export interface Chapter {
  index: number;
  title: string;
  text: string;
}

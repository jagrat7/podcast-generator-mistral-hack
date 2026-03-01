import { generateObject } from "ai"
import { z } from "zod"
import { mistral } from "~/lib/mistral"
import type { PodcastFormat } from "~/lib/constants"
import type { PodcastScript } from "./types"

interface Character {
  name: string
  personality: string
  speakingStyle?: string | null
  speakingQuirks?: string | null
  role?: string | null
  modifier?: string | null
}

interface ScriptGeneratorInput {
  documentText: string
  characters: Character[]
  format: PodcastFormat
  title: string
}

// Schema the LLM outputs — uses speaker IDs (SP1, SP2) instead of names
const llmSegmentSchema = z.object({
  speakerId: z.string().describe("Speaker identifier like SP1, SP2, etc."),
  text: z.string(),
  emotion: z.string().optional(),
})

const llmScriptSchema = z.object({
  title: z.string(),
  segments: z.array(llmSegmentSchema),
})

type LlmSegment = z.infer<typeof llmSegmentSchema>
type LlmScript = z.infer<typeof llmScriptSchema>

export async function generateScript(
  input: ScriptGeneratorInput,
): Promise<PodcastScript> {
  const { documentText, characters, format, title } = input

  console.log(`[script-generator] Input text length: ${documentText.length} chars`)
  console.log(`[script-generator] Input text preview: "${documentText.slice(0, 300)}..."`)
  console.log(`[script-generator] Characters:`, characters.map(c => c.name))
  console.log(`[script-generator] Format: ${format}, Title: ${title}`)

  const truncatedText = documentText.slice(0, 30000)

  // Build speaker ID mapping: SP1 → character[0], SP2 → character[1], etc.
  const speakerIdToName = new Map<string, string>()
  const characterDescriptions = characters
    .map((c, i) => {
      const speakerId = `SP${i + 1}`
      speakerIdToName.set(speakerId.toLowerCase(), c.name)

      let desc = `[${speakerId}]: ${c.personality}`
      if (c.speakingStyle) desc += ` Speaking style: ${c.speakingStyle}.`
      if (c.speakingQuirks) desc += ` Quirks: ${c.speakingQuirks}.`
      if (c.role) desc += ` Role in this episode: ${c.role}.`
      if (c.modifier) desc += ` For this episode only: ${c.modifier}.`
      return desc
    })
    .join("\n\n")

  const formatPrompts: Record<PodcastFormat, string> = {
    interview:
      "Create an engaging interview-style conversation where one character asks questions and others provide insights.",
    debate:
      "Create a lively debate where characters present different perspectives and challenge each other's viewpoints.",
    storytelling:
      "Create a narrative where characters tell the story in their unique voices, building on each other's contributions.",
    educational:
      "Create an educational discussion where characters explain concepts clearly, with examples and analogies.",
    comedy:
      "Create a humorous take on the content with witty banter and comedic observations from the characters.",
    roundtable:
      "Create a roundtable discussion where all characters contribute equally with diverse perspectives.",
  }

  const systemPrompt = `You are a podcast script writer. Generate a natural, engaging podcast script in the ${format} format.

Speakers:
${characterDescriptions}

IMPORTANT RULES:
1. Each speaker must speak in their distinctive voice matching their personality and quirks
2. Keep the conversation natural and flowing - avoid robotic exchanges
3. Each segment should be 1-3 sentences max
4. Include emotions in parentheses when appropriate (e.g., excited, thoughtful, amused, skeptical)
5. Stay true to the source material while making it entertaining
6. ${formatPrompts[format]}
7. Aim for 20-40 segments total
8. Use ONLY the speaker IDs provided (SP1, SP2, etc.) for speakerId. Do NOT use names.`

  const userPrompt = `Create a podcast script titled "${title}" based on this content:

${truncatedText}

Generate a structured script with natural dialogue that brings the content to life through these speakers.`

  console.log(`[script-generator] Truncated text length: ${truncatedText.length} chars`)
  console.log(`[script-generator] Truncated text preview: "${truncatedText.slice(0, 500)}..."`)
  console.log(`[script-generator] Full user prompt length: ${userPrompt.length} chars`)

  // Map speaker IDs back to real character names
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
  const llmResult: LlmScript = (await generateObject({
    model: mistral("mistral-large-2512"),
    schema: llmScriptSchema,
    system: systemPrompt,
    prompt: userPrompt,
  }) as any).object
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

  const mappedSegments = llmResult.segments.map((seg: LlmSegment) => {
    const idLower = seg.speakerId.toLowerCase().replace(/\s+/g, "")
    const name = speakerIdToName.get(idLower)
      ?? speakerIdToName.get(idLower.replace("speaker", "sp"))
      ?? characters[0]?.name ?? "Unknown"

    if (!speakerIdToName.get(idLower) && !speakerIdToName.get(idLower.replace("speaker", "sp"))) {
      console.warn(`Unknown speakerId "${seg.speakerId}", defaulting to "${name}"`)
    }

    return {
      speakerName: name,
      text: seg.text,
      emotion: seg.emotion,
    }
  })

  return {
    title: llmResult.title,
    segments: mappedSegments,
  }
}

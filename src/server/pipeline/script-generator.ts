import { generateObject } from "ai"
import { mistral } from "~/lib/mistral"
import type { PodcastFormat } from "~/lib/constants"
import { podcastScriptSchema, type PodcastScript } from "./types"

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

export async function generateScript(input: ScriptGeneratorInput): Promise<PodcastScript> {
  const { documentText, characters, format, title } = input
  
  // Limit document text to ~30k chars
  const truncatedText = documentText.slice(0, 30000)
  
  const characterDescriptions = characters.map((c) => {
    let desc = `${c.name}: ${c.personality}`
    if (c.speakingStyle) desc += ` Speaking style: ${c.speakingStyle}.`
    if (c.speakingQuirks) desc += ` Quirks: ${c.speakingQuirks}.`
    if (c.role) desc += ` Role in this episode: ${c.role}.`
    if (c.modifier) desc += ` For this episode only: ${c.modifier}.`
    return desc
  }).join("\n\n")
  
  const formatPrompts: Record<PodcastFormat, string> = {
    interview: "Create an engaging interview-style conversation where one character asks questions and others provide insights.",
    debate: "Create a lively debate where characters present different perspectives and challenge each other's viewpoints.",
    storytelling: "Create a narrative where characters tell the story in their unique voices, building on each other's contributions.",
    educational: "Create an educational discussion where characters explain concepts clearly, with examples and analogies.",
    comedy: "Create a humorous take on the content with witty banter and comedic observations from the characters.",
    roundtable: "Create a roundtable discussion where all characters contribute equally with diverse perspectives.",
  }
  
  const systemPrompt = `You are a podcast script writer. Generate a natural, engaging podcast script in the ${format} format.

Characters:
${characterDescriptions}

IMPORTANT RULES:
1. Each character must speak in their distinctive voice matching their personality and quirks
2. Keep the conversation natural and flowing - avoid robotic exchanges
3. Each segment should be 1-3 sentences max
4. Include emotions in parentheses when appropriate (e.g., excited, thoughtful, amused, skeptical)
5. Stay true to the source material while making it entertaining
6. ${formatPrompts[format]}
7. Aim for 20-40 segments total`

  const userPrompt = `Create a podcast script titled "${title}" based on this content:

${truncatedText}

Generate a structured script with natural dialogue that brings the content to life through these characters.`

  const result = await generateObject({
    model: mistral("mistral-large-latest"),
    schema: podcastScriptSchema,
    system: systemPrompt,
    prompt: userPrompt,
  })
  
  return result.object
}

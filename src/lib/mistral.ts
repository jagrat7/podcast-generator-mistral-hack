import { createMistral } from "@ai-sdk/mistral"
import { env } from "~/env"

export const mistral = createMistral({ apiKey: env.MISTRAL_API_KEY })

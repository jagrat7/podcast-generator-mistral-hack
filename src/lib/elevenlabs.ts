import { ElevenLabsClient } from "elevenlabs";
import { env } from "~/env";

export const elevenlabs = new ElevenLabsClient({
  apiKey: env.ELEVENLABS_API_KEY,
});

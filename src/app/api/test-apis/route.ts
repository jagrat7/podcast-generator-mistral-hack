import { NextResponse } from "next/server";
import { mistral } from "~/lib/mistral";
import { elevenlabs } from "~/lib/elevenlabs";
import { generateText } from "ai";

export async function GET() {
  const results = {
    mistral: { status: "pending" as string, message: "" },
    elevenlabs: { status: "pending" as string, message: "" },
    timestamp: new Date().toISOString(),
  };

  // Test Mistral API
  try {
    const { text } = await generateText({
      model: mistral("mistral-small-latest"),
      prompt: "Say 'API connection successful' in exactly those words.",
    });
    results.mistral = {
      status: "connected",
      message: text,
    };
  } catch (error) {
    results.mistral = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test ElevenLabs API
  try {
    const voices = await elevenlabs.voices.search();
    results.elevenlabs = {
      status: "connected",
      message: `Found ${voices.voices?.length ?? 0} voices`,
    };
  } catch (error) {
    results.elevenlabs = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return NextResponse.json(results);
}

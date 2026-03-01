import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { stat } from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;

    // Construct file path from segments
    const filePath = path.join("storage", ...pathSegments);

    // Check if file exists
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".mp3" ? "audio/mpeg" : "application/octet-stream";

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Audio serve error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to serve audio",
      },
      { status: 500 },
    );
  }
}

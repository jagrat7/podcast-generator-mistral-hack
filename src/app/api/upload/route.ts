import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { nanoid } from "nanoid"
import { db } from "~/server/db"
import { books } from "~/server/db/schema"
import { parseEpub } from "~/server/pipeline/epub-parser"
import { UPLOADS_DIR } from "~/lib/constants"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    
    // Validate file extension
    if (!file.name.endsWith(".epub")) {
      return NextResponse.json({ error: "Only .epub files are allowed" }, { status: 400 })
    }
    
    // Save file to uploads directory
    const fileName = `${nanoid(10)}.epub`
    const filePath = path.join(UPLOADS_DIR, fileName)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)
    
    // Parse epub to extract chapters
    const { bookTitle, chapters } = await parseEpub(filePath)
    
    // Save to database
    const [book] = await db.insert(books).values({
      fileName: file.name,
      filePath,
      title: bookTitle,
      chaptersJson: JSON.stringify(chapters),
    }).returning()
    
    return NextResponse.json({
      bookId: book!.id,
      bookTitle,
      chapterCount: chapters.length,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}

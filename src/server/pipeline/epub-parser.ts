import EPub from "epub2";
import type { Chapter } from "./types";

export async function parseEpub(
  filePath: string,
): Promise<{ bookTitle: string; chapters: Chapter[] }> {
  console.log(`[epub-parser] Starting to parse: ${filePath}`)
  
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on("error", (err) => {
      console.error(`[epub-parser] Error:`, err)
      reject(err)
    });

    epub.on("end", async () => {
      const bookTitle = epub.metadata.title ?? "Unknown Book";
      const chapters: Chapter[] = [];

      const spine = epub.flow;
      console.log(`[epub-parser] Found ${spine.length} spine items`)

      for (let i = 0; i < spine.length; i++) {
        const spineItem = spine[i];
        if (!spineItem?.id) continue;
        const chapterId = spineItem.id;

        try {
          const chapterData = await new Promise<{ text: string }>(
            (res, rej) => {
              epub.getChapter(chapterId, (error, text) => {
                if (error) rej(error);
                else res({ text: text ?? "" });
              });
            },
          );

          // Strip HTML tags
          const plainText = chapterData.text
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          // Get chapter title from TOC if available
          const tocItem = epub.toc.find((item) =>
            item.href?.includes(chapterId),
          );
          const title = tocItem?.title ?? `Chapter ${i + 1}`;

          console.log(`[epub-parser] Chapter ${i} "${title}": ${plainText.length} chars`)
          
          chapters.push({
            index: i,
            title,
            text: plainText,
          });
        } catch (error) {
          console.error(`[epub-parser] Error parsing chapter ${i}:`, error);
        }
      }

      console.log(`[epub-parser] Total chapters: ${chapters.length}, total text: ${chapters.reduce((sum, c) => sum + c.text.length, 0)} chars`)
      resolve({ bookTitle, chapters });
    });

    epub.parse();
  });
}

import EPub from "epub2";
import type { Chapter } from "./types";

// Emotion to sound mappings (similar to MCP code)
const EMOTION_SOUNDS: Record<string, string[]> = {
  laughing: ["haha", "hehe", "ahaha", "ehehe"],
  sighing: ["*sigh*", "*deep breath*"],
  gasping: ["*gasp*", "oh!", "ah!"],
  chuckling: ["heh", "hmm"],
  crying: ["*sniff*", "*sob*"],
  thinking: ["hmm", "uhh", "let me see"],
  surprised: ["oh!", "wow!", "what?!"],
  confused: ["huh?", "what?", "hmm?"],
  excited: ["yes!", "oh wow!", "amazing!"],
  angry: ["ugh!", "argh!", "grr!"],
  nervous: ["um", "uh", "err"],
  "clearing throat": ["*ahem*", "*cough*"],
};

function processEmotionalText(
  text: string,
  emotion: string,
): { cleanedText: string; emotionalPrefix: string | null } {
  // Remove emotion tags from text
  const cleanedText = text.replace(/\s*\[([^\]]+)\]\s*/g, " ").trim();

  // Get emotional sound/prefix if applicable
  let emotionalPrefix: string | null = null;
  if (emotion && EMOTION_SOUNDS[emotion]) {
    const sounds = EMOTION_SOUNDS[emotion];
    if (sounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * sounds.length);
      emotionalPrefix = sounds[randomIndex] ?? null;
    }
  }

  return { cleanedText, emotionalPrefix };
}

function parseScriptRobust(
  script: string,
): Array<{ speaker: string; text: string; emotion: string }> {
  const dialogueSegments: Array<{
    speaker: string;
    text: string;
    emotion: string;
  }> = [];

  // Remove markdown formatting
  let processedScript = script
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/#{1,6}\s*/g, "") // Headers
    .replace(/```[^`]*```/g, "") // Code blocks
    .replace(/`([^`]+)`/g, "$1"); // Inline code

  // Split into lines and process
  const lines = processedScript.split("\n");
  let currentSpeaker: { name: string; emotion: string } | null = null;
  let currentText: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and separators
    if (
      !trimmedLine ||
      trimmedLine === "---" ||
      trimmedLine.startsWith("===")
    ) {
      continue;
    }

    // Try to detect speaker patterns: "Speaker [emotion]: Text"
    const speakerMatch = trimmedLine.match(
      /^([A-Za-z\s\-\'\.]+?)(?:\[([^\]]+)\])\s*:\s*(.+)$/,
    );

    if (speakerMatch && speakerMatch.length >= 4) {
      // Save previous segment if exists
      if (currentSpeaker && currentText.length > 0) {
        const combinedText = currentText.join(" ");

        // Check for inline emotions in the text
        const inlineEmotionMatch = combinedText.match(/\[([^\]]+)\]/);
        let finalEmotion = currentSpeaker.emotion;
        if (inlineEmotionMatch && inlineEmotionMatch[1]) {
          finalEmotion = inlineEmotionMatch[1].toLowerCase();
          const finalText = combinedText
            .replace(/\s*\[([^\]]+)\]\s*/g, " ")
            .trim();
          dialogueSegments.push({
            speaker: currentSpeaker.name,
            text: finalText,
            emotion: finalEmotion,
          });
        } else {
          dialogueSegments.push({
            speaker: currentSpeaker.name,
            text: combinedText,
            emotion: currentSpeaker.emotion,
          });
        }
        currentText = [];
      }

      // Start new segment
      const speakerName = speakerMatch[1] ? speakerMatch[1].trim() : "Unknown";
      const emotion = speakerMatch[2]
        ? speakerMatch[2].toLowerCase()
        : "neutral";
      let text = speakerMatch[3] ? speakerMatch[3].trim() : "";

      // Check for emotion tags within the text itself
      const textEmotionMatch = text.match(/\[([^\]]+)\]/);
      let finalEmotion = emotion;
      if (textEmotionMatch && textEmotionMatch[1]) {
        finalEmotion = textEmotionMatch[1].toLowerCase();
        text = text.replace(/\s*\[([^\]]+)\]\s*/g, " ").trim();
      }

      currentSpeaker = { name: speakerName, emotion: finalEmotion };
      currentText = text ? [text] : [];
    } else if (currentSpeaker && trimmedLine) {
      // Continuation of previous speaker's text
      const inlineEmotionMatch = trimmedLine.match(/\[([^\]]+)\]/);
      if (inlineEmotionMatch && inlineEmotionMatch[1] && currentSpeaker) {
        const newEmotion = inlineEmotionMatch[1].toLowerCase();
        const lineWithoutEmotion = trimmedLine
          .replace(/\s*\[([^\]]+)\]\s*/g, " ")
          .trim();
        currentSpeaker = { name: currentSpeaker.name, emotion: newEmotion };
        currentText.push(lineWithoutEmotion);
      } else {
        currentText.push(trimmedLine);
      }
    }
  }

  // Don't forget the last segment
  if (currentSpeaker && currentText.length > 0) {
    const combinedText = currentText.join(" ");
    const inlineEmotionMatch = combinedText.match(/\[([^\]]+)\]/);
    if (inlineEmotionMatch && inlineEmotionMatch[1]) {
      const finalEmotion = inlineEmotionMatch[1].toLowerCase();
      const finalText = combinedText.replace(/\s*\[([^\]]+)\]\s*/g, " ").trim();
      dialogueSegments.push({
        speaker: currentSpeaker.name,
        text: finalText,
        emotion: finalEmotion,
      });
    } else {
      dialogueSegments.push({
        speaker: currentSpeaker.name,
        text: combinedText,
        emotion: currentSpeaker.emotion,
      });
    }
  }

  // If no segments found, try alternative parsing
  if (dialogueSegments.length === 0) {
    // Try to split by double newlines
    const paragraphs = processedScript.split("\n\n");
    for (let i = 0; i < paragraphs.length; i++) {
      const para = (paragraphs[i] || "").trim();
      if (para) {
        // Check for emotions in paragraph
        let emotion = "neutral";
        const emotionMatch = para.match(/\[([^\]]+)\]/);
        if (emotionMatch && emotionMatch[1]) {
          emotion = emotionMatch[1].toLowerCase();
          const paraWithoutEmotion = para
            .replace(/\s*\[([^\]]+)\]\s*/g, " ")
            .trim();
          // Assign alternating speakers
          const speaker = i % 2 === 0 ? "Speaker 1" : "Speaker 2";
          dialogueSegments.push({
            speaker,
            text: paraWithoutEmotion,
            emotion,
          });
        } else {
          const speaker = i % 2 === 0 ? "Speaker 1" : "Speaker 2";
          dialogueSegments.push({
            speaker,
            text: para,
            emotion,
          });
        }
      }
    }
  }

  return dialogueSegments;
}

export async function parseEpub(
  filePath: string,
): Promise<{ bookTitle: string; chapters: Chapter[] }> {
  console.log(`[epub-parser] Starting to parse: ${filePath}`);

  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on("error", (err) => {
      console.error(`[epub-parser] Error:`, err);
      reject(err);
    });

    epub.on("end", async () => {
      const bookTitle = epub.metadata.title ?? "Unknown Book";
      const chapters: Chapter[] = [];

      const spine = epub.flow;
      console.log(`[epub-parser] Found ${spine.length} spine items`);

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

          console.log(
            `[epub-parser] Chapter ${i} "${title}": ${plainText.length} chars`,
          );

          // Enhanced processing: try to parse dialogue structure with emotions
          const dialogueSegments = parseScriptRobust(plainText);

          if (dialogueSegments.length > 0) {
            // If we found dialogue structure, store it in a more structured way
            const chapterText = dialogueSegments
              .map((seg) => `${seg.speaker} [${seg.emotion}]: ${seg.text}`)
              .join("\n\n");

            chapters.push({
              index: i,
              title,
              text: chapterText,
            });
          } else {
            // Fallback to plain text if no dialogue structure detected
            chapters.push({
              index: i,
              title,
              text: plainText,
            });
          }
        } catch (error) {
          console.error(`[epub-parser] Error parsing chapter ${i}:`, error);
        }
      }

      console.log(
        `[epub-parser] Total chapters: ${chapters.length}, total text: ${chapters.reduce((sum, c) => sum + c.text.length, 0)} chars`,
      );
      resolve({ bookTitle, chapters });
    });

    epub.parse();
  });
}

export { processEmotionalText, parseScriptRobust };

# Backend Implementation Plan

## Context

Rewriting the Python MCP podcast pipeline in TypeScript as a set of tRPC routers, pipeline modules, and API routes integrated into the existing T3 stack (Next.js 15, tRPC v11, Drizzle/SQLite, Zod).

The podcast generation pipeline uses **Vercel Workflow (WDK)** — each stage is a durable `'use step'` function, orchestrated by a `'use workflow'` function. Steps auto-retry on failure, survive crashes/deploys, and are observable in the Vercel dashboard. This replaces the manual fire-and-forget + polling approach.

Core flow: upload epub → parse chapters → user picks a chapter → Mistral generates dialogue script → ElevenLabs Voice Design API creates character voices → ElevenLabs TTS generates per-segment audio → ffmpeg concatenates into final MP3.

---

## Step 1: Install Dependencies

```bash
bun add ai @ai-sdk/mistral elevenlabs epub2 nanoid workflow
```

- `ai` + `@ai-sdk/mistral` — Vercel AI SDK with Mistral provider
- `elevenlabs` — Official ElevenLabs TS SDK (voice design + TTS)
- `epub2` — Epub parser with chapter-aware extraction and TOC support
- `nanoid` — Short unique IDs for filenames
- `workflow` — Vercel WDK for durable workflow execution
- `ffmpeg` — System dependency, called via `child_process.execFile`

---

## Step 2: Environment Variables

**File:** `src/env.js`

Add to `server` schema:
```js
MISTRAL_API_KEY: z.string().min(1),
ELEVENLABS_API_KEY: z.string().min(1),
```

Add to `runtimeEnv`:
```js
MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
```

---

## Step 3: Database Schema

**File:** `src/server/db/schema.ts` — extend the existing file, keep the `createTable`.

### `characters`
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | autoIncrement |
| name | text(100) | e.g. "Donald Trump" |
| personality | text | Base LLM persona — who they are, how they normally think and speak |
| speakingStyle | text | nullable, e.g. "short punchy sentences, rhetorical questions" |
| speakingQuirks | text | nullable, e.g. "says 'tremendous' often, interrupts himself" |
| audioSamplesJson | text | nullable, JSON array of uploaded audio file paths for ElevenLabs cloning |
| elevenLabsVoiceId | text | nullable, cached after first clone call; cleared if audioSamples change |
| createdAt / updatedAt | timestamp | |

**Note:** `voiceDescription` is removed — voices are cloned from audio, not described in text. Character fields (`personality`, `speakingStyle`, `speakingQuirks`) all feed the Mistral prompt to control dialogue behaviour.

### `books`
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| fileName | text | Original epub filename |
| filePath | text | Absolute path in storage/uploads/ |
| title | text(256) | Extracted from epub metadata |
| chaptersJson | text | JSON array of `{ index, title, text }` — extracted on upload |
| createdAt | timestamp | |

---

### `podcasts`
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| title | text(256) | |
| bookId | integer | FK → books.id |
| chapterIndex | integer | Which chapter was used |
| chapterTitle | text | Chapter title for display |
| format | text(50) | interview / debate / storytelling / educational / comedy / roundtable |
| status | text(30) | pending → scripting → generating_voices → generating_audio → combining → completed / failed |
| progress | integer | 0–100 |
| errorMessage | text | nullable |
| scriptJson | text | Full generated script stored as JSON string |
| outputFilePath | text | nullable, set on completion |
| durationSeconds | integer | nullable |
| createdAt / updatedAt | timestamp | |

### `podcastCharacters` (join table)
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| podcastId | integer | FK → podcasts.id |
| characterId | integer | FK → characters.id |
| role | text(50) | nullable, e.g. host / guest / narrator |
| modifier | text | nullable, per-podcast personality twist — stacked on top of base personality. e.g. "has a cold, sounds tired", "unusually calm and agreeable", "slightly drunk" |

**How modifier works in the LLM prompt:** Mistral receives the character's full base personality + speaking style + quirks, then the modifier is appended as an additional instruction: *"For this episode only: {modifier}"*. This lets the same Trump character be normal Trump in one podcast and sick/tired Trump in another without changing the character record.

### `podcastSegments`
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| podcastId | integer | FK → podcasts.id |
| characterId | integer | FK → characters.id |
| orderIndex | integer | Segment position in script |
| text | text | Dialogue line |
| emotion | text(50) | nullable, e.g. excited / thoughtful / amused |
| audioFilePath | text | nullable |
| durationMs | integer | nullable |
| status | text(20) | pending / generating / completed / failed |

---

## Step 4: Shared Libs

### `src/lib/constants.ts`
```ts
export const PODCAST_FORMATS = ["interview","debate","storytelling","educational","comedy","roundtable"] as const
export type PodcastFormat = (typeof PODCAST_FORMATS)[number]

export const UPLOADS_DIR = "storage/uploads"
export const SEGMENTS_DIR = "storage/segments"
export const OUTPUT_DIR = "storage/output"
```

### `src/lib/mistral.ts`
```ts
import { createMistral } from "@ai-sdk/mistral"
export const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY })
```

### `src/lib/elevenlabs.ts`
```ts
import { ElevenLabsClient } from "elevenlabs"
export const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
```

---

## Step 5: Pipeline Modules (`src/server/pipeline/`)

Each module exports a `'use step'` function — isolated, auto-retried by WDK on failure.

### `types.ts`
Zod schemas exported for reuse:
- `scriptSegmentSchema` — `{ speakerName, text, emotion? }`
- `podcastScriptSchema` — `{ title, segments: scriptSegmentSchema[] }`

---

### `epub-parser.ts`

```ts
interface Chapter {
  index: number
  title: string
  text: string
}

async function parseEpub(filePath: string): Promise<{ bookTitle: string; chapters: Chapter[] }> {
  'use step'
  // Use epub2 to open the file
  // Extract book title from epub metadata
  // Walk the spine/TOC to get ordered chapters
  // For each chapter: strip HTML tags, return plain text
  // Returns list of { index, title, text }
}
```

Called once on upload — chapters stored as JSON in the `books` table. No re-parsing needed per podcast.

### `script-generator.ts`
```ts
async function generateScript(input: {
  documentText: string
  characters: Array<{ name, personality, speakingStyle, speakingQuirks, role }>
  format: PodcastFormat
  title: string
}): Promise<PodcastScript> {
  'use step'
  // generateObject() with mistral("mistral-large-latest")
  // Returns structured output validated against podcastScriptSchema
  // Document text capped at 30k chars
}
```

### `voice-cloner.ts`

```ts
async function ensureVoiceForCharacter(characterId: number): Promise<string> {
  'use step'
  // Returns cached elevenLabsVoiceId if present on character
  // Otherwise calls ElevenLabs Instant Voice Clone API:
  //   elevenlabs.voices.add({ name, files: audioSampleBuffers })
  // Persists returned voice_id to DB on character record
  // Throws if character has no audioSamples uploaded yet
}
```

Audio samples are uploaded separately via `POST /api/upload-voice-sample` and stored as paths in `audioSamplesJson`. If `audioSamplesJson` changes, `elevenLabsVoiceId` is cleared so the clone is regenerated on next podcast generation.

### `audio-generator.ts`
```ts
async function generateSegmentAudio(input: {
  voiceId: string
  text: string
  segmentId: number
  podcastId: number
}): Promise<{ filePath: string; durationMs: number }> {
  'use step'
  // elevenlabs.textToSpeech.convert() → stream to storage/segments/{podcastId}/
}
```

### `audio-combiner.ts`
```ts
async function combineAudio(input: {
  segmentPaths: string[]
  podcastId: number
  title: string
}): Promise<{ outputPath: string; durationSeconds: number }> {
  'use step'
  // Write ffmpeg concat file list
  // execFile ffmpeg with loudnorm + fade filters
  // ffprobe for accurate duration
  // Output: storage/output/{podcastId}-{nanoid}.mp3
}
```

---

## Step 6: Workflow Orchestrator

**File:** `src/server/pipeline/podcast-workflow.ts`

This is the top-level durable workflow. It's marked `'use workflow'` so WDK manages state, retries, and observability automatically.

```ts
import { db } from "~/server/db"
import { podcasts, podcastCharacters, podcastSegments, characters } from "~/server/db/schema"
import { eq } from "drizzle-orm"
import { parseDocument } from "./document-parser"
import { generateScript } from "./script-generator"
import { ensureVoiceForCharacter } from "./voice-designer"
import { generateSegmentAudio } from "./audio-generator"
import { combineAudio } from "./audio-combiner"

export async function podcastWorkflow(podcastId: number) {
  'use workflow'

  // Load podcast + characters from DB
  const podcast = await db.query.podcasts.findFirst({ where: eq(podcasts.id, podcastId) })
  const pcRows = await db.query.podcastCharacters.findMany({ where: eq(podcastCharacters.podcastId, podcastId) })
  const charRows = await loadCharacters(pcRows)

  // Load chapter text from stored chaptersJson (no re-parsing needed)
  const book = await db.query.books.findFirst({ where: eq(books.id, podcast.bookId) })
  const chapters = JSON.parse(book.chaptersJson) as Chapter[]
  const chapter = chapters.find(c => c.index === podcast.chapterIndex)!
  const documentText = chapter.text

  // Step 2: Generate script with Mistral
  await updateStatus(podcastId, "scripting", 15)
  const script = await generateScript({ documentText, characters: charRows, format: podcast.format, title: podcast.title })
  await db.update(podcasts).set({ scriptJson: JSON.stringify(script) }).where(eq(podcasts.id, podcastId))

  // Step 3: Design voices for each character (cached after first call)
  await updateStatus(podcastId, "generating_voices", 25)
  const voiceMap = new Map<string, string>()
  for (const c of charRows) {
    voiceMap.set(c.name, await ensureVoiceForCharacter(c.id))
  }

  // Step 4: Generate audio per segment
  await updateStatus(podcastId, "generating_audio", 30)
  const segmentPaths: string[] = []
  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i]
    const [row] = await db.insert(podcastSegments).values({ podcastId, characterId: charRows.find(c => c.name === seg.speakerName)!.id, orderIndex: i, text: seg.text, emotion: seg.emotion ?? null, status: "generating" }).returning()
    const { filePath, durationMs } = await generateSegmentAudio({ voiceId: voiceMap.get(seg.speakerName)!, text: seg.text, segmentId: row.id, podcastId })
    await db.update(podcastSegments).set({ audioFilePath: filePath, durationMs, status: "completed" }).where(eq(podcastSegments.id, row.id))
    segmentPaths.push(filePath)
    const progress = 30 + Math.round((i / script.segments.length) * 60)
    await updateStatus(podcastId, "generating_audio", progress)
  }

  // Step 5: Combine audio with ffmpeg
  await updateStatus(podcastId, "combining", 92)
  const { outputPath, durationSeconds } = await combineAudio({ segmentPaths, podcastId, title: podcast.title })

  // Done
  await db.update(podcasts).set({ status: "completed", progress: 100, outputFilePath: outputPath, durationSeconds }).where(eq(podcasts.id, podcastId))
}

async function updateStatus(podcastId: number, status: string, progress: number) {
  await db.update(podcasts).set({ status, progress }).where(eq(podcasts.id, podcastId))
}
```

**Why WDK vs manual orchestrator:**

- Each `'use step'` function auto-retries on transient failures (ElevenLabs flakiness, network errors)
- The workflow survives crashes and Next.js deploys — resumes from exact step where it left off
- Fully observable in Vercel dashboard without any extra logging code
- No manual try/catch state machine

**Triggering the workflow** from tRPC:

```ts
// In podcast.create mutation:
import { podcastWorkflow } from "~/server/pipeline/podcast-workflow"
void podcastWorkflow(podcast.id)  // fire-and-forget, WDK manages the rest
```

---

## Step 7: tRPC Routers

### `src/server/api/routers/character.ts`
- `list` — all characters, desc by createdAt
- `getById(id)` — single character
- `create({ name, personality, speakingStyle?, speakingQuirks? })`
- `update({ id, ...partial })` — clears `elevenLabsVoiceId` if `audioSamplesJson` changes
- `delete({ id })`

### `src/server/api/routers/book.ts`

- `list` — all uploaded books
- `getById(id)` — book with parsed `chaptersJson`
- `getChapters(id)` — returns `Chapter[]` parsed from `chaptersJson` (title + index only, no full text for efficiency)
- `delete(id)` — deletes book record + file from disk

### `src/server/api/routers/podcast.ts`
- `list` — all podcasts, desc by createdAt
- `getById(id)` — podcast with segments + character associations
- `getStatus(id)` — lightweight: `{ status, progress, errorMessage, outputFilePath }` (used for polling)
- `create({ title, bookId, chapterIndex, chapterTitle, format, characterIds, characterRoles?, characterModifiers? })` → inserts records → `void podcastWorkflow(id)` → returns immediately
- `delete(id)` — cascades: deletes segments + podcastCharacters first

### `src/server/api/root.ts`
Register `character`, `book`, and `podcast` routers. Remove the example `post` router.

---

## Step 8: API Route Handlers

### `src/app/api/upload/route.ts` (POST)
- Accepts `multipart/form-data` with a `file` field
- Validates extension: epub only
- Saves to `storage/uploads/{nanoid}.epub`
- Calls `parseEpub(filePath)` to extract chapters immediately
- Inserts a `books` record with `chaptersJson`, `title`, `fileName`, `filePath`
- Returns `{ bookId: number, bookTitle: string, chapterCount: number }`

### `src/app/api/upload-voice-sample/route.ts` (POST)

- Accepts `multipart/form-data` with `characterId` + one or more audio files (mp3, wav, m4a)
- Saves files to `storage/voice-samples/{characterId}/`
- Appends paths to character's `audioSamplesJson`
- Clears `elevenLabsVoiceId` so the clone regenerates on next use
- Returns `{ sampleCount: number }`

### `src/app/api/audio/[...path]/route.ts` (GET)
- Serves files from `storage/` directory
- `storage/output/123-abc.mp3` → accessible at `/api/audio/output/123-abc.mp3`
- Returns 404 if file not found

---

## Critical Files

| File | Action |
|------|--------|
| `src/env.js` | Add MISTRAL_API_KEY, ELEVENLABS_API_KEY |
| `src/server/db/schema.ts` | Add 4 new tables |
| `src/server/api/root.ts` | Register new routers, remove post |
| `src/lib/constants.ts` | Create |
| `src/lib/mistral.ts` | Create |
| `src/lib/elevenlabs.ts` | Create |
| `src/server/pipeline/types.ts` | Create |
| `src/server/pipeline/epub-parser.ts` | Create (`'use step'`) |
| `src/server/pipeline/script-generator.ts` | Create (`'use step'`) |
| `src/server/pipeline/voice-designer.ts` | Create (`'use step'`) |
| `src/server/pipeline/audio-generator.ts` | Create (`'use step'`) |
| `src/server/pipeline/audio-combiner.ts` | Create (`'use step'`) |
| `src/server/pipeline/podcast-workflow.ts` | Create (`'use workflow'`) |
| `src/server/api/routers/character.ts` | Create |
| `src/server/api/routers/book.ts` | Create |
| `src/server/api/routers/podcast.ts` | Create |
| `src/app/api/upload/route.ts` | Create |
| `src/app/api/audio/[...path]/route.ts` | Create |

---

## Verification

1. `bun run db:push` — confirm all 5 tables created (characters, books, podcasts, podcastCharacters, podcastSegments)
2. `POST /api/upload` with an epub — confirm file in `storage/uploads/`, book record created, chapters extracted
3. `book.getChapters(id)` — confirm chapter list returned with titles
4. Create a character — confirm `elevenLabsVoiceId` is null initially
5. Create a podcast (pick a short chapter + 2 characters) — watch status progress via polling
6. Confirm `scriptJson` is stored on the podcast record
7. Confirm segment MP3s appear in `storage/segments/`
8. Confirm final MP3 appears in `storage/output/` and `outputFilePath` is set
9. Check Vercel dashboard → Observability → Workflows to see step-by-step execution trace
10. Create a second podcast with same characters — confirm `elevenLabsVoiceId` is reused (no new design API call)
11. Test resilience: kill the dev server mid-generation, restart — confirm workflow resumes

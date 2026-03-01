# Frontend Implementation Plan

## Context

Building the UI for a podcast generator app where users create fully custom characters (with voice cloning from audio samples and distinctive personalities — e.g. "Trump explaining quantum physics with McGregor"), upload an epub book, configure a podcast, and get a generated audio file back. The frontend polls for generation progress and plays the final audio in-browser.

Stack: Next.js 15 App Router, tRPC v11 + React Query, Tailwind CSS v4, shadcn/ui components, react-hook-form, zod.

**Design System:** Mistral-themed with two style options:
1. **Professional Dark** — Extracted brand colors (orange gradients, dark backgrounds, beige accents), glass morphism, smooth animations

2. **Cartoonish/Playful** — PostHog-style with hand-drawn borders, bouncy animations, quirky illustrations, bright orange accents on light backgrounds

Both themes use the same Mistral orange brand color as the primary accent.



## Pages & Routes

```
src/app/
├── page.tsx                        # Dashboard / home
├── characters/
│   ├── page.tsx                    # Character list
│   └── [id]/
│       └── page.tsx                # Create or edit character (shared form)
├── podcasts/
│   ├── page.tsx                    # Podcast list
│   ├── new/
│   │   └── page.tsx                # Multi-step creation wizard
│   └── [id]/
│       └── page.tsx                # Podcast detail + player
└── _components/                    # Shared components
    ├── nav.tsx
    ├── character-card.tsx
    ├── podcast-card.tsx
    ├── progress-bar.tsx
    └── audio-player.tsx
```

---

## Step 1: Navigation Shell

**File:** `src/app/layout.tsx`

Update root layout to include a top navigation bar with links to:
- Home (dashboard)
- Characters
- Podcasts

Keep the existing Geist font setup and Tailwind globals.

**File:** `src/app/_components/nav.tsx`
- Simple horizontal nav bar
- Active link highlighting using Next.js `usePathname`

---

## Step 2: Dashboard (`src/app/page.tsx`)

Replace the existing T3 example content with:
- Heading + short app description
- Two action cards: "Build a Character" and "Generate a Podcast"
- Recent podcasts section (last 5, with status badges)
- Recent characters section (last 4, as compact cards)

Data fetching: `api.podcast.list` and `api.character.list` via tRPC server components or client with React Query.

---

## Step 3: Character Pages

### Character List (`src/app/characters/page.tsx`)
- Grid of `<CharacterCard>` components
- Each card shows: name, personality preview (truncated), speaking style
- Actions: Edit (link to `[id]`), Delete (confirmation dialog)
- "New Character" button links to `/characters/new`
- Empty state with call to action

### Character Card (`src/app/_components/character-card.tsx`)
- Name + personality snippet
- Voice description preview
- Edit / Delete buttons

### Character Form (`src/app/characters/[id]/page.tsx`)
Used for both create (`/characters/new` → id = "new") and edit.

**Fields (react-hook-form + zod):**
| Field | Type | Notes |
|-------|------|-------|
| Name | text input | e.g. "Donald Trump" |
| Audio Samples | file upload (multi) | Upload 1-5 audio samples (mp3, wav, m4a) for ElevenLabs voice cloning. Min 30s total recommended. |
| Personality Prompt | textarea | How the LLM should write this character's dialogue. e.g. "Brash, uses superlatives, often circles back to himself" |
| Speaking Style | text input | optional, e.g. "Uses rhetorical questions, speaks in short punchy sentences" |
| Speaking Quirks | text input | optional, e.g. "Says 'tremendous' often, interrupts himself" |

On submit: `api.character.create` or `api.character.update` mutation → redirect to `/characters`

**Note on voice caching:** If editing an existing character and audio samples change, the `update` mutation clears the cached ElevenLabs voice ID. Show a subtle warning: "Changing audio samples will regenerate the voice."

**Audio upload flow:** Files uploaded via `POST /api/upload-voice-sample` with characterId, stored in `storage/voice-samples/{characterId}/`, paths saved to `audioSamplesJson`.

---

## Step 4: Podcast List (`src/app/podcasts/page.tsx`)

- List of all podcasts with: title, format badge, status badge, duration, created date
- Click to view detail
- "Generate Podcast" button → `/podcasts/new`
- Status badge colors:
  - pending / generating: yellow
  - completed: green
  - failed: red

### Podcast Card (`src/app/_components/podcast-card.tsx`)
- Title, format, status badge, duration (if completed)

---

## Step 5: Podcast Creation Wizard (`src/app/podcasts/new/page.tsx`)

Four-step wizard with local state (no server persistence until final submit).

### Step 1: Upload Epub

- Drag-and-drop file input — epub only (validated)
- On drop/select: `POST /api/upload` via `fetch` with FormData
- Server parses chapters immediately using `epub2` library, returns `{ bookId, bookTitle, chapterCount }`
- Show book title + chapter count after upload with success animation
- Store `{ bookId, bookTitle }` in local state
- Use shadcn/ui components for file upload UI

### Step 2: Pick a Chapter

- Calls `api.book.getChapters(bookId)` to load chapter list
- Shows scrollable list of chapters with index + title
- User picks one chapter
- Store `{ chapterIndex, chapterTitle }` in local state

### Step 3: Configure

- **Title** — text input, auto-populated as `"{bookTitle} — {chapterTitle}"` (editable)
- **Format** — select from: interview, debate, storytelling, educational, comedy, roundtable
  - Show a one-line description of each format option
- **Characters** — multi-select from existing characters
  - Show character cards with a checkbox/toggle
  - Select 2–6 characters
  - For each selected character, a dropdown to assign role: host / guest / narrator / (none)
  - "Create new character" link opens character creation in a new tab
- All validated with zod before proceeding

### Step 4: Review & Generate

- Summary card: book title, chapter title, format, characters with roles
- "Generate Podcast" button
- On click: `api.podcast.create` mutation → redirect to `/podcasts/{id}` (the detail page handles polling)

---

## Step 6: Podcast Detail + Player (`src/app/podcasts/[id]/page.tsx`)

This page handles both in-progress and completed states.

### In Progress State
- Status label (e.g. "Generating script...", "Creating voices...", "Generating audio...")
- Progress bar (0–100%) animated

**Polling logic:**
```tsx
const { data: status } = api.podcast.getStatus.useQuery(
  { id: podcastId },
  {
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return (s === "completed" || s === "failed") ? false : 2000
    },
  },
)
```

Status label mapping:
- `pending` → "Queued"
- `scripting` → "Writing script with Mistral AI..."
- `generating_voices` → "Cloning character voices with ElevenLabs..."
- `generating_audio` → "Generating audio segments..."
- `combining` → "Mixing final audio with ffmpeg..."
- `completed` → done
- `failed` → show error

**Backend uses Vercel Workflow (WDK)** — each stage is a durable step with auto-retry. Progress updates are real-time via tRPC polling.

### Completed State
- Audio player: `<audio controls src="/api/audio/output/xxx.mp3">` (native HTML5)
- Download button linking to the same audio URL
- Podcast metadata: title, format, characters, duration, generated date

**Component:** `src/app/_components/audio-player.tsx`
- Wraps native `<audio>` with custom styled controls
- Play/pause, progress scrubber, time display, volume, download

### Script Viewer (collapsible)
- Toggle to show/hide the full generated script
- Render each segment as: `[CharacterName] (emotion): dialogue text`
- Useful for demo/debugging

### Failed State
- Error message display
- "Retry" button — calls `api.podcast.create` with the same params (or a dedicated retry endpoint)

---

## Step 7: Shared Components

### `progress-bar.tsx`
- Animated progress bar with percentage label
- Accepts `value: number` (0–100) and optional `label: string`

### `audio-player.tsx`
- Styled audio player wrapping native `<audio>`
- Controls: play/pause, scrubber, current time / total duration, volume slider, download

---

## Form Validation Schemas (zod)

### Character form
```ts
z.object({
  name: z.string().min(1).max(100),
  voiceDescription: z.string().min(20, "Be descriptive — at least 20 characters"),
  personality: z.string().min(20, "Be descriptive — at least 20 characters"),
  speakingStyle: z.string().optional(),
  speakingQuirks: z.string().optional(),
})
```

### Podcast wizard — configure step
```ts
z.object({
  title: z.string().min(1),
  format: z.enum(["interview","debate","storytelling","educational","comedy","roundtable"]),
  characterIds: z.array(z.number()).min(2, "Pick at least 2 characters").max(6),
  characterRoles: z.record(z.string(), z.string()).optional(),
})
```

---

## Design System

### Mistral Brand Colors (Extracted)

**Primary Palette:**

- `--mistral-orange`: `17 96% 52%` (hsl) — Primary brand color
- `--mistral-orange-bright`: `30 100% 51%` — Accent highlights
- `--mistral-red`: `1 100% 44%` — Error states, alerts
- `--mistral-beige`: `45 100% 96%` — Light backgrounds, cards
- `--mistral-beige-deep`: `0 0% 12%` — Dark backgrounds
- `--mistral-black-matt`: `0 0% 12%` — Primary dark surface

**Gradient Bands (Footer/Hero):**

- Band 1: `255 11% 7%` (deep black)
- Band 2: `51 100% 50%` (yellow)
- Band 3: `41 100% 50%` (amber)
- Band 4: `30 100% 51%` (orange-bright)
- Band 5: `17 96% 52%` (orange)
- Band 6: `1 100% 44%` (red)

### Component Styling

**Cards:** Glass morphism with `bg-white/10` dark mode, `bg-white/80` light mode, subtle borders, backdrop blur

**Buttons:**

- Primary: Mistral orange gradient with hover lift effect
- Secondary: Outlined with orange border
- Ghost: Transparent with orange hover

**Typography:**

- Headings: Bold, large scale (3xl-6xl)
- Body: 16px minimum, line-height 1.6
- Use system fonts or consider distinctive pairing

**Animations:**

- Smooth transitions (200-300ms)
- Staggered reveals on page load
- Progress bars with gradient fills
- Hover states with scale/glow effects

**Icons:** Lucide React (consistent, modern SVG icons)

### Mistral Design Patterns (From Site Analysis)

**Hero Sections:**

- Large, bold typography with animated word reveals
- Dark backgrounds with gradient overlays
- Orange accent CTAs with arrow icons
- Floating product screenshots with subtle shadows

**Feature Cards:**

- Grid layout with icon + heading + description
- Beige/light icons on dark backgrounds
- Orange checkmarks for feature lists
- Smooth hover transitions

**Navigation:**

- Fixed header with glass morphism effect
- Logo on left, nav center, CTAs right
- Dropdown menus with smooth animations
- Mobile hamburger menu

**Footer:**

- Multi-column layout
- Gradient band decoration (6 colors from black to red)
- Social links with hover states
- App store badges

**Chat Interface (Le Chat):**

- Clean input field with placeholder
- Quick action buttons below input
- Mode toggles (Research, Think, Tools)
- Tab-based content organization

### Theme Configuration

All colors defined in `src/styles/globals.css` using CSS custom properties for easy theming. Support light/dark mode with `useTheme` from next-themes.

---

## UX Notes

- **No auth** — single-user for hackathon MVP
- **Audio sample guidance** — show helper text: "Upload 1-5 clear audio samples (30s+ total recommended) of the voice you want to clone. Higher quality = better results."
- **Format descriptions** — show a tooltip or subtitle for each podcast format when selecting
- **Character role assignment** — keep it optional; default to no role (the LLM assigns roles naturally from personality)
- **File upload limits** — epub max 50MB, audio samples max 10MB each, show accepted formats in drop zone
- **Character modifiers** — optional per-podcast personality tweaks (e.g. "has a cold", "unusually calm") without changing base character
- **Mistral branding** — use orange accents throughout, dark theme by default, smooth animations

---

## Critical Files

| File | Action |
|------|--------|
| `src/styles/globals.css` | Create with Mistral theme colors |
| `src/lib/utils.ts` | Create (cn helper for shadcn) |
| `src/components/ui/` | Create shadcn components (button, card, input, etc.) |
| `src/components/theme-provider.tsx` | Create (next-themes wrapper) |
| `src/app/layout.tsx` | Update to add nav + theme provider |
| `src/app/page.tsx` | Replace with dashboard |
| `src/app/_components/nav.tsx` | Create |
| `src/app/_components/character-card.tsx` | Create |
| `src/app/_components/podcast-card.tsx` | Create |
| `src/app/_components/progress-bar.tsx` | Create |
| `src/app/_components/audio-player.tsx` | Create |
| `src/app/_components/file-upload.tsx` | Create (drag-drop for epub + audio) |
| `src/app/characters/page.tsx` | Create |
| `src/app/characters/[id]/page.tsx` | Create (handles new + edit) |
| `src/app/podcasts/page.tsx` | Create |
| `src/app/podcasts/new/page.tsx` | Create (4-step wizard) |
| `src/app/podcasts/[id]/page.tsx` | Create (detail + player + polling) |

---

## Verification

1. Navigate to `/characters` — see empty state with "New Character" CTA
2. Create a character with all fields — confirm it appears in the list
3. Edit the character, change voice description — see the voice regeneration warning
4. Navigate to `/podcasts/new` — complete all 3 wizard steps
5. Confirm redirect to detail page and progress bar starts animating
6. Wait for generation to complete — confirm audio player appears and audio plays
7. Check script viewer toggles correctly
8. Navigate to dashboard — confirm recent podcasts and characters show

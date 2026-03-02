# Podcaster.ai

This is a kinda done implementation app that takes a book (epub) and transforms it into dynamic multi-character podcasts, you can pick the chapter(s) you want to generate the podcast for. You can create and personalize your own character voices with unique personalities and speaking styles. It was for a Mistral AI hackathon so th ui is inspired by that. 

I got accepted to the hackathon pretty late, so I didn't have enough time to make something properly polished. I didn't end up submitting it, so now it just lives here in its current graveyard state.

![Podcaster.ai Demo Preview](./docs/Kooha-2026-03-01-19-21-33.gif)

[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/bDo1gHLTi14) ← **Demo with podcast audio**

## Features

- **Voice Registry** - Create and manage character voice profiles with custom personalities and speaking styles
- **Advanced Emotion Handling** - Properly processes emotional cues like [laughing], [sighing], [excited] and converts them to actual sounds
- **Multi-Character Dialogue** - AI-generated conversations between multiple voices with distinct personalities
- **Robust Script Parsing** - Intelligent parsing of epub chapters to extract dialogue structure and emotional content
- **High-Quality Audio Synthesis** - Professional voice output via ElevenLabs with emotion-aware voice modulation
- **Multiple Podcast Formats** - Support for interview, debate, storytelling, educational, comedy, and roundtable formats
- **Progressive Generation** - Real-time progress tracking with detailed status updates

## Stuff still to implement 

- Better injestion for books, perhaps a rag pipeline
- Remove confusing abstractions from the UI and make it more intuitive
- Remove stuff that was generated in an attempt to copy Mistral AI's UI and doesnt make sense for the app

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS 4 + shadcn/ui
- **AI**: Mistral AI (via AI SDK) - Advanced LLM for script generation
- **Voice**: ElevenLabs API - High-quality text-to-speech with emotion support
- **Database**: SQLite (libsql) + Drizzle ORM - Lightweight embedded database
- **Workflow**: Vercel Workflow (WDK) - Durable podcast generation pipeline
- **File Processing**: EPUB parsing with dialogue and emotion extraction

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

```env
# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Database
DATABASE_URL=file:./sqlite.db
```

### Database Setup

```bash
# Generate migrations
bun db:generate

# Push schema to database
bun db:push
```

### Development

```bash
# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.


## Enhanced Features


## License

MIT

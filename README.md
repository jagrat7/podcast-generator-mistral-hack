# Podcaster.ai

Transform epub documents into dynamic multi-character podcasts powered by Mistral AI and ElevenLabs.

## Features

- **Voice Registry** - Create and manage character voice profiles
- **Podcast Generation** - Convert epub books into engaging podcast conversations
- **Multi-Character Dialogue** - AI-generated conversations between multiple voices
- **Audio Synthesis** - High-quality voice output via ElevenLabs

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS 4 + shadcn/ui
- **AI**: Mistral AI (via AI SDK)
- **Voice**: ElevenLabs API
- **Database**: SQLite (libsql) + Drizzle ORM
- **API**: tRPC for type-safe endpoints
- **Forms**: React Hook Form + Zod validation

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

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── characters/        # Voice Registry
│   └── podcasts/          # Podcast Archive
├── components/            # React components
│   ├── nav.tsx           # Navigation
│   ├── footer.tsx        # Footer
│   └── ui/               # shadcn/ui components
├── server/               # Backend
│   └── api/              # tRPC routers
└── styles/               # Global CSS
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun typecheck` | Run TypeScript check |
| `bun db:studio` | Open Drizzle Studio |

## License

MIT

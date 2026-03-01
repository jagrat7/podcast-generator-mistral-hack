"use client"

import Link from "next/link"
import { Mic2, ArrowRight, Volume2, Plus } from "lucide-react"
import { api } from "~/trpc/react"

export default function CharactersPage() {
  const { data: characters, isLoading } = api.character.list.useQuery()

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 border-b-2 border-border pb-6 flex items-end justify-between">
        <div>
          <span className="text-sm font-mono text-primary mb-2 block tracking-widest">REGISTRY // 01</span>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Voice Profiles</h1>
        </div>
        <Link 
          href="/characters/new"
          className="inline-flex h-10 items-center justify-center mistral-gradient px-6 text-sm font-medium text-white transition-all hover:-translate-y-[2px]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Profile
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel h-64 animate-pulse opacity-50" />
          ))}
        </div>
      ) : !characters || characters.length === 0 ? (
        <div className="bg-card border-2 border-border flex flex-col items-center justify-center py-32 text-center relative overflow-hidden">
          <div className="mb-8 flex h-20 w-20 items-center justify-center bg-secondary border-2 border-border relative z-10">
            <Mic2 className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-foreground relative z-10">No Voice Profiles Found</h3>
          <p className="mb-8 max-w-md text-muted-foreground relative z-10">
            Voice profiles map base audio samples to ElevenLabs synthesis models. Initialize a profile to begin.
          </p>
          <Link 
            href="/characters/new"
            className="inline-flex h-12 items-center justify-center bg-background border-2 border-border px-8 text-sm font-bold text-foreground shadow-[4px_4px_0px_0px_var(--color-mistral-orange)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-mistral-orange)] relative z-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Initialize Profile
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => {
            const sampleCount = character.audioSamplesJson
              ? (JSON.parse(character.audioSamplesJson) as string[]).length
              : 0
            const hasVoice = !!character.elevenLabsVoiceId

            return (
              <Link
                key={character.id}
                href={`/characters/${character.id}`}
                className="glass-panel group relative p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg flex flex-col h-full"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center bg-secondary text-primary">
                    <Mic2 className="h-6 w-6" />
                  </div>
                  {hasVoice && (
                    <span className="flex items-center gap-1.5 border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-mono font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                      <Volume2 className="h-3 w-3" />
                      Model Ready
                    </span>
                  )}
                </div>

                <h3 className="mb-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors">{character.name}</h3>
                <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground flex-grow">
                  {character.personality}
                </p>

                <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      SAMPLES: {sampleCount.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

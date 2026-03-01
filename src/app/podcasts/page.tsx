"use client";

import Link from "next/link";
import { Headphones, ArrowRight, Clock, Radio, Plus } from "lucide-react";
import { api } from "~/trpc/react";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: {
    label: "QUEUED",
    color:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  scripting: {
    label: "SYNTHESIZING SCRIPT",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  generating_voices: {
    label: "CLONING VOICES",
    color:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  generating_audio: {
    label: "GENERATING AUDIO",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  combining: {
    label: "MIXING AUDIO",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  completed: {
    label: "COMPLETED",
    color:
      "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  },
  failed: {
    label: "FAILED",
    color: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function PodcastsPage() {
  const { data: podcasts, isLoading } = api.podcast.list.useQuery();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <div className="border-border mb-12 flex items-end justify-between border-b-2 pb-6">
        <div>
          <span className="text-primary mb-2 block font-mono text-sm tracking-widest">
            ARCHIVE // 02
          </span>
          <h1 className="text-foreground text-4xl font-bold tracking-tight">
            Audio Outputs
          </h1>
        </div>
        <Link
          href="/podcasts/new"
          className="mistral-gradient inline-flex h-10 items-center justify-center px-6 text-sm font-medium text-white transition-all hover:-translate-y-[2px]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Synthesis
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-panel h-28 animate-pulse opacity-50"
            />
          ))}
        </div>
      ) : !podcasts || podcasts.length === 0 ? (
        <div className="bg-card border-border relative flex flex-col items-center justify-center overflow-hidden border-2 py-32 text-center">
          <div className="bg-secondary border-border relative z-10 mb-8 flex h-20 w-20 items-center justify-center border-2">
            <Headphones className="text-primary h-10 w-10" />
          </div>
          <h3 className="text-foreground relative z-10 mb-3 text-2xl font-bold">
            Archive Empty
          </h3>
          <p className="text-muted-foreground relative z-10 mb-8 max-w-md">
            No active or completed synthesis tasks found. Supply an epub
            document to begin.
          </p>
          <Link
            href="/podcasts/new"
            className="bg-background border-border text-foreground relative z-10 inline-flex h-12 items-center justify-center border-2 px-8 text-sm font-bold shadow-[4px_4px_0px_0px_var(--color-mistral-orange)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-mistral-orange)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Initialize Synthesis
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {podcasts.map((podcast) => {
            const status =
              statusConfig[podcast.status] ?? statusConfig.pending!;
            const duration = formatDuration(podcast.durationSeconds);
            const isInProgress = !["completed", "failed"].includes(
              podcast.status,
            );

            return (
              <Link
                key={podcast.id}
                href={`/podcasts/${podcast.id}`}
                className="glass-panel group flex items-center gap-6 p-6 transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-mistral-orange)]"
              >
                <div className="bg-card border-border text-primary flex h-14 w-14 shrink-0 items-center justify-center border">
                  {isInProgress ? (
                    <Radio className="text-mistral-amber h-6 w-6 animate-pulse" />
                  ) : (
                    <Headphones className="h-6 w-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-foreground group-hover:text-primary truncate text-xl font-bold transition-colors">
                    {podcast.title}
                  </h3>
                  <div className="text-muted-foreground mt-2 flex items-center gap-4 font-mono text-sm">
                    {podcast.chapterTitle && (
                      <span className="border-border truncate border-r pr-4">
                        {podcast.chapterTitle}
                      </span>
                    )}
                    <span className="tracking-widest uppercase">
                      FMT: {podcast.format}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-6">
                  {duration && (
                    <span className="text-muted-foreground border-border bg-card flex items-center gap-2 border px-3 py-1 font-mono text-sm font-bold">
                      <Clock className="h-4 w-4" />
                      {duration}
                    </span>
                  )}
                  <span
                    className={`flex items-center gap-1.5 border px-3 py-1 font-mono text-[10px] font-bold tracking-wider uppercase ${status.color}`}
                  >
                    {status.label}
                  </span>
                  <div className="bg-card border-border text-muted-foreground/40 group-hover:text-primary flex h-10 w-10 items-center justify-center border transition-colors">
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

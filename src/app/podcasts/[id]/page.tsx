"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Play, Pause, SkipBack, SkipForward, Volume2, Clock, Users, Book, RefreshCw, AlertCircle } from "lucide-react"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Progress } from "~/components/ui/progress"

type PodcastStatus = "pending" | "script_generating" | "script_generated" | "voice_cloning" | "audio_generating" | "completed" | "failed"

const statusLabels: Record<PodcastStatus, string> = {
  pending: "Pending",
  script_generating: "Generating Script...",
  script_generated: "Script Ready",
  voice_cloning: "Cloning Voices...",
  audio_generating: "Generating Audio...",
  completed: "Complete",
  failed: "Failed",
}

export default function PodcastDetailPage() {
  const router = useRouter()
  const params = useParams()
  const podcastId = Number(params.id)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const { data: podcast, isLoading, refetch } = api.podcast.getById.useQuery(
    { id: podcastId },
    { enabled: !!podcastId, refetchInterval: 5000 }
  )

  const deletePodcast = api.podcast.delete.useMutation()

  const status = podcast?.status as PodcastStatus ?? "pending"
  const progress = podcast?.progress ?? 0

  // Auto-refetch for in-progress podcasts
  useEffect(() => {
    if (status === "completed" || status === "failed") return
    const interval = setInterval(() => {
      refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [status, refetch])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this podcast?")) return
    try {
      await deletePodcast.mutateAsync({ id: podcastId })
      router.push("/podcasts")
    } catch (error) {
      console.error("Failed to delete podcast:", error)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = percent * duration
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!podcast) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Podcast not found</h1>
        <Link href="/podcasts" className="text-primary hover:underline">
          Back to Library
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-12 border-b-2 border-border pb-6">
        <Link
          href="/podcasts"
          className="group mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Library
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-mono text-primary mb-2 block tracking-widest">
              SYNTHESIS // {String(podcastId).padStart(3, "0")}
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {podcast.title}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="h-10 border-2 border-border bg-card px-4 text-sm font-bold text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="h-10 border-2 border-red-500/30 bg-red-500/5 px-4 text-sm font-bold text-red-600 hover:bg-red-500/10"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="mb-8 border-2 border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {status === "completed" ? (
              <div className="flex h-10 w-10 items-center justify-center bg-green-500/10 text-green-500">
                <Volume2 className="h-5 w-5" />
              </div>
            ) : status === "failed" ? (
              <div className="flex h-10 w-10 items-center justify-center bg-red-500/10 text-red-500">
                <AlertCircle className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            <div>
              <p className="font-bold text-foreground">{statusLabels[status]}</p>
              <p className="text-sm text-muted-foreground">
                {status === "completed" 
                  ? "Ready to play" 
                  : status === "failed"
                  ? podcast.errorMessage ?? "An error occurred"
                  : `${progress}% complete`}
              </p>
            </div>
          </div>
          {podcast.durationSeconds && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(podcast.durationSeconds)}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {status !== "completed" && status !== "failed" && (
          <Progress value={progress} className="h-2" />
        )}
      </div>

      {/* Audio Player */}
      {status === "completed" && podcast.outputFilePath && (
        <div className="mb-8 border-2 border-border bg-card p-6">
          <audio
            ref={audioRef}
            src={`/api/audio/${podcast.outputFilePath.replace("storage/output/", "")}`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Progress Bar */}
          <div
            className="mb-4 h-2 cursor-pointer bg-secondary"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, currentTime - 15)
                  }
                }}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlay}
                className="mistral-gradient flex h-14 w-14 items-center justify-center text-white hover:opacity-90 transition-opacity"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(duration, currentTime + 15)
                  }
                }}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm font-mono text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
      )}

      {/* Meta Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Book Info */}
        <div className="border-2 border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Book className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Source Material</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Book ID: {podcast.bookId}</p>
          <p className="text-sm text-muted-foreground">
            Chapter {podcast.chapterIndex + 1}: {podcast.chapterTitle ?? "Untitled"}
          </p>
          <p className="text-xs font-mono text-muted-foreground mt-2 uppercase">
            Format: {podcast.format}
          </p>
        </div>

        {/* Characters */}
        <div className="border-2 border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Voice Cast</h3>
          </div>
          <div className="space-y-2">
            {podcast.characters?.map((pc) => (
              <div key={pc.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{pc.character.name}</span>
                {pc.role && (
                  <span className="text-xs font-mono text-muted-foreground uppercase">
                    {pc.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Script Preview */}
      {podcast.scriptJson && (
        <div className="border-2 border-border bg-card p-6">
          <h3 className="font-bold text-foreground mb-4">Script Preview</h3>
          <div className="max-h-64 overflow-y-auto space-y-3">
            {podcast.segments?.map((segment, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 text-xs font-mono text-primary uppercase w-24">
                  {segment.character.name}
                </span>
                <p className="text-sm text-muted-foreground">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Volume2, Upload, Trash2, Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { Label } from "~/components/ui/label"

const characterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  personality: z.string().min(20, "Personality must be at least 20 characters"),
  speakingStyle: z.string().optional(),
  speakingQuirks: z.string().optional(),
})

type CharacterForm = z.infer<typeof characterSchema>

export default function CharacterDetailPage() {
  const router = useRouter()
  const params = useParams()
  const characterId = Number(params.id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [audioSamples, setAudioSamples] = useState<string[]>([])

  const { data: character, isLoading, refetch } = api.character.getById.useQuery(
    { id: characterId },
    { enabled: !!characterId }
  )

  const updateCharacter = api.character.update.useMutation()
  const deleteCharacter = api.character.delete.useMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CharacterForm>({
    resolver: zodResolver(characterSchema),
  })

  // Populate form when character loads
  useEffect(() => {
    if (character) {
      reset({
        name: character.name,
        personality: character.personality,
        speakingStyle: character.speakingStyle ?? "",
        speakingQuirks: character.speakingQuirks ?? "",
      }, {
        keepDirty: false,
        keepTouched: false,
      })
      if (character.audioSamplesJson) {
        setAudioSamples(JSON.parse(character.audioSamplesJson) as string[])
      }
    }
  }, [character, reset])

  const onSubmit = async (data: CharacterForm) => {
    setIsSubmitting(true)
    try {
      await updateCharacter.mutateAsync({
        id: characterId,
        ...data,
      })
      router.push("/characters")
    } catch (error) {
      console.error("Failed to update character:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this character?")) return
    try {
      await deleteCharacter.mutateAsync({ id: characterId })
      router.push("/characters")
    } catch (error) {
      console.error("Failed to delete character:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const fileNames = fileArray.map((f) => f.name)
    setUploadingFiles(fileNames)

    const formData = new FormData()
    formData.append("characterId", String(characterId))
    fileArray.forEach((file) => formData.append("files", file))

    try {
      const res = await fetch("/api/upload-voice-sample", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.sampleCount) {
        // Refetch character to get updated samples
        const updated = await refetch()
        if (updated.data?.audioSamplesJson) {
          setAudioSamples(JSON.parse(updated.data.audioSamplesJson) as string[])
        }
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploadingFiles([])
    }
  }

  const removeAudioSample = async (index: number) => {
    const updated = audioSamples.filter((_, i) => i !== index)
    setAudioSamples(updated)
    await updateCharacter.mutateAsync({
      id: characterId,
      audioSamplesJson: JSON.stringify(updated),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!character) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Character not found</h1>
        <Link href="/characters" className="text-primary hover:underline">
          Back to Registry
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-12 border-b-2 border-border pb-6">
        <Link
          href="/characters"
          className="group mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Registry
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-mono text-primary mb-2 block tracking-widest">
              REGISTRY // EDIT
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {character.name}
            </h1>
          </div>
          {character.elevenLabsVoiceId && (
            <span className="flex items-center gap-1.5 border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-mono font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
              <Volume2 className="h-3.5 w-3.5" />
              Voice Ready
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider">
            Character Name
          </Label>
          <Input
            id="name"
            className="h-12 border-2 border-border bg-card px-4 text-foreground focus:border-primary"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Personality */}
        <div className="space-y-2">
          <Label htmlFor="personality" className="text-sm font-bold uppercase tracking-wider">
            Personality Description
          </Label>
          <Textarea
            id="personality"
            rows={4}
            className="border-2 border-border bg-card px-4 py-3 text-foreground focus:border-primary resize-none"
            {...register("personality")}
          />
          {errors.personality && (
            <p className="text-sm text-red-500">{errors.personality.message}</p>
          )}
        </div>

        {/* Speaking Style */}
        <div className="space-y-2">
          <Label htmlFor="speakingStyle" className="text-sm font-bold uppercase tracking-wider">
            Speaking Style <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="speakingStyle"
            className="h-12 border-2 border-border bg-card px-4 text-foreground focus:border-primary"
            {...register("speakingStyle")}
          />
        </div>

        {/* Speaking Quirks */}
        <div className="space-y-2">
          <Label htmlFor="speakingQuirks" className="text-sm font-bold uppercase tracking-wider">
            Speaking Quirks <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="speakingQuirks"
            rows={2}
            className="border-2 border-border bg-card px-4 py-3 text-foreground focus:border-primary resize-none"
            {...register("speakingQuirks")}
          />
        </div>

        {/* Audio Samples */}
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider">
            Voice Samples
          </Label>
          <p className="text-sm text-muted-foreground">
            Upload audio samples for voice cloning. At least 1 minute of clear audio is recommended.
          </p>

          {/* Upload Button */}
          <div>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="inline-flex h-12 cursor-pointer items-center justify-center border-2 border-dashed border-border bg-card px-6 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Audio Files
            </label>
          </div>

          {/* Uploading indicator */}
          {uploadingFiles.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {uploadingFiles.length} file(s)...
            </div>
          )}

          {/* Sample List */}
          {audioSamples.length > 0 && (
            <div className="space-y-2">
              {audioSamples.map((sample, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-border bg-card px-4 py-3"
                >
                  <span className="text-sm font-mono text-foreground truncate flex-1">
                    {sample.split("/").pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAudioSample(i)}
                    className="ml-4 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="h-12 border-2 border-red-500/30 bg-red-500/5 px-6 text-sm font-bold text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/characters")}
            className="h-12 border-2 border-border bg-card px-6 text-sm font-bold text-foreground hover:bg-secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            // disabled={isSubmitting || !isDirty}
            className="mistral-gradient h-12 px-8 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

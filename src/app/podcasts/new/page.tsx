"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Upload, Plus, Check, RefreshCw } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { PODCAST_FORMATS, type PodcastFormat } from "~/lib/constants"

const podcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  bookId: z.number().min(1, "Book is required"),
  chapterIndex: z.number().min(0, "Chapter is required"),
  chapterTitle: z.string().optional(),
  format: z.enum(PODCAST_FORMATS),
  characterIds: z.array(z.number()).min(2, "At least 2 characters required").max(6, "Maximum 6 characters"),
  characterRoles: z.record(z.string(), z.string()).optional(),
  characterModifiers: z.record(z.string(), z.string()).optional(),
})

type PodcastForm = z.infer<typeof podcastSchema>

export default function NewPodcastPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [uploadedBookId, setUploadedBookId] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: books, refetch: refetchBooks } = api.book.list.useQuery()
  const { data: characters, refetch: refetchCharacters } = api.character.list.useQuery()
  const { data: chapters } = api.book.getChapters.useQuery(
    { id: uploadedBookId ?? 0 },
    { enabled: !!uploadedBookId }
  )

  const createPodcast = api.podcast.create.useMutation()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<PodcastForm>({
    resolver: zodResolver(podcastSchema),
    defaultValues: {
      title: "",
      bookId: 0,
      chapterIndex: 0,
      chapterTitle: "",
      format: "interview",
      characterIds: [],
      characterRoles: {},
      characterModifiers: {},
    },
  })

  const selectedBookId = watch("bookId")
  const selectedChapterIndex = watch("chapterIndex")
  const selectedCharacterIds = watch("characterIds")

  useEffect(() => {
    if (selectedBookId && selectedBookId > 0) {
      setUploadedBookId(selectedBookId)
    }
  }, [selectedBookId])

  useEffect(() => {
    if (chapters && chapters.length > 0 && selectedChapterIndex !== undefined) {
      const chapter = chapters.find((c) => c.index === selectedChapterIndex)
      if (chapter) {
        setValue("chapterTitle", chapter.title)
      }
    }
  }, [chapters, selectedChapterIndex, setValue])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.bookId) {
        setValue("bookId", data.bookId)
        setUploadedBookId(data.bookId)
        setStep(2)
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const toggleCharacter = (characterId: number) => {
    const current = [...selectedCharacterIds]
    const index = current.indexOf(characterId)
    if (index > -1) {
      current.splice(index, 1)
    } else {
      if (current.length >= 6) return
      current.push(characterId)
    }
    setValue("characterIds", current)
  }

  const onSubmit = async (data: PodcastForm) => {
    setIsSubmitting(true)
    try {
      const podcast = await createPodcast.mutateAsync(data)
      router.push(`/podcasts/${podcast.id}`)
    } catch (error) {
      console.error("Failed to create podcast:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatLabels: Record<PodcastFormat, string> = {
    interview: "Interview",
    debate: "Debate",
    storytelling: "Storytelling",
    educational: "Educational",
    comedy: "Comedy",
    roundtable: "Roundtable",
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
        <span className="text-sm font-mono text-primary mb-2 block tracking-widest">
          SYNTHESIS // NEW
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Generate Podcast
        </h1>
      </div>

      {/* Progress Steps */}
      <div className="mb-12 flex items-center gap-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center border-2 text-sm font-bold ${
                step >= s
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-12 ${step > s ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Upload Book */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Upload a Book</h2>
              <p className="text-muted-foreground">
                Upload an epub file to extract chapters for podcast generation.
              </p>
            </div>

            {/* Existing Books */}
            {books && books.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold uppercase tracking-wider">
                    Or Select Existing Book
                  </Label>
                  <button
                    type="button"
                    onClick={() => refetchBooks()}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
                <div className="grid gap-3">
                  {books.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setValue("bookId", book.id)
                        setUploadedBookId(book.id)
                        setStep(2)
                      }}
                      className="flex items-center justify-between border-2 border-border bg-card p-4 text-left hover:border-primary transition-colors"
                    >
                      <div>
                        <p className="font-bold text-foreground">{book.title}</p>
                        <p className="text-sm text-muted-foreground">{book.fileName}</p>
                      </div>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-wider">
                Upload New Book
              </Label>
              <div>
                <input
                  type="file"
                  accept=".epub"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="book-upload"
                />
                <label
                  htmlFor="book-upload"
                  className="flex h-32 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border bg-card hover:border-primary transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Click to upload epub
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Chapter */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Select Chapter</h2>
              <p className="text-muted-foreground">
                Choose which chapter to convert into a podcast.
              </p>
            </div>

            {chapters && chapters.length > 0 ? (
              <div className="space-y-3">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.index}
                    type="button"
                    onClick={() => {
                      setValue("chapterIndex", chapter.index)
                      setValue("chapterTitle", chapter.title)
                      setStep(3)
                    }}
                    className={`flex w-full items-center justify-between border-2 p-4 text-left transition-colors ${
                      selectedChapterIndex === chapter.index
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-mono text-muted-foreground">
                        CHAPTER {String(chapter.index + 1).padStart(2, "0")}
                      </span>
                      <p className="font-bold text-foreground">{chapter.title}</p>
                    </div>
                    {selectedChapterIndex === chapter.index ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-12 border-2 border-border bg-card px-6 text-sm font-bold text-foreground"
            >
              Back
            </Button>
          </div>
        )}

        {/* Step 3: Select Characters */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Select Characters</h2>
                <p className="text-muted-foreground">
                  Choose 2-6 characters to voice the podcast. Each will have a unique voice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchCharacters()}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {characters && characters.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {characters.map((character) => {
                  const isSelected = selectedCharacterIds.includes(character.id)
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => toggleCharacter(character.id)}
                      className={`flex items-start gap-4 border-2 p-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-secondary text-primary">
                        <span className="text-lg font-bold">{character.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">{character.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {character.personality}
                        </p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No characters found</p>
                <Link
                  href="/characters/new"
                  className="inline-flex h-12 items-center justify-center mistral-gradient px-6 text-sm font-bold text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Character
                </Link>
              </div>
            )}

            {errors.characterIds && (
              <p className="text-sm text-red-500">{errors.characterIds.message}</p>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="h-12 border-2 border-border bg-card px-6 text-sm font-bold text-foreground"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(4)}
                disabled={selectedCharacterIds.length < 2}
                className="mistral-gradient h-12 px-8 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Configure & Generate */}
        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Configure Podcast</h2>
              <p className="text-muted-foreground">
                Set the title and format for your podcast.
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-bold uppercase tracking-wider">
                Podcast Title
              </Label>
              <Input
                id="title"
                placeholder="Enter a title for your podcast"
                className="h-12 border-2 border-border bg-card px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wider">
                Podcast Format
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PODCAST_FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setValue("format", format)}
                    className={`border-2 p-3 text-sm font-bold transition-colors ${
                      watch("format") === format
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary"
                    }`}
                  >
                    {formatLabels[format]}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-2 border-border bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Summary
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Book:</span>{" "}
                  <span className="text-foreground font-medium">
                    {books?.find((b) => b.id === selectedBookId)?.title}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Chapter:</span>{" "}
                  <span className="text-foreground font-medium">
                    {chapters?.find((c) => c.index === selectedChapterIndex)?.title}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Characters:</span>{" "}
                  <span className="text-foreground font-medium">
                    {selectedCharacterIds
                      .map((id) => characters?.find((c) => c.id === id)?.name)
                      .join(", ")}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                className="h-12 border-2 border-border bg-card px-6 text-sm font-bold text-foreground"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="mistral-gradient h-12 px-8 text-sm font-bold text-white hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Podcast"
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

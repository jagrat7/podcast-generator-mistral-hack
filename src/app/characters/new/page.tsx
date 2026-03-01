"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
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

export default function NewCharacterPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createCharacter = api.character.create.useMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CharacterForm>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: "",
      personality: "",
      speakingStyle: "",
      speakingQuirks: "",
    },
  })

  const onSubmit = async (data: CharacterForm) => {
    setIsSubmitting(true)
    try {
      const character = await createCharacter.mutateAsync(data)
      if (character) {
        router.push(`/characters/${character.id}`)
      }
    } catch (error) {
      console.error("Failed to create character:", error)
    } finally {
      setIsSubmitting(false)
    }
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
        <span className="text-sm font-mono text-primary mb-2 block tracking-widest">
          REGISTRY // NEW
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Create Voice Profile
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider">
            Character Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Professor Arcane"
            className="h-12 border-2 border-border bg-card px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
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
            placeholder="Describe the character's personality, background, and worldview in detail. This helps the AI generate authentic dialogue."
            rows={4}
            className="border-2 border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary resize-none"
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
            placeholder="e.g., Formal, academic with occasional dry humor"
            className="h-12 border-2 border-border bg-card px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
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
            placeholder="e.g., Pauses dramatically before key points, uses academic metaphors"
            rows={2}
            className="border-2 border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary resize-none"
            {...register("speakingQuirks")}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
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
            disabled={isSubmitting}
            className="mistral-gradient h-12 px-8 text-sm font-bold text-white hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Profile"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

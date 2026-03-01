import Link from "next/link"
import { Mic2, BookOpen, ArrowRight, Upload, Sparkles, Headphones } from "lucide-react"

const steps = [
  {
    icon: Mic2,
    title: "Create Characters",
    description: "Define unique personalities and upload audio samples for voice cloning with ElevenLabs.",
  },
  {
    icon: Upload,
    title: "Upload a Book",
    description: "Drop in an epub file — chapters are extracted automatically, ready for podcast generation.",
  },
  {
    icon: Sparkles,
    title: "Generate Script",
    description: "Mistral AI writes a natural dialogue script based on your characters and chosen chapter.",
  },
  {
    icon: Headphones,
    title: "Listen & Share",
    description: "Each character speaks in their cloned voice. Download your podcast as a single MP3 file.",
  },
]

export default function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero with Mistral sunset gradient */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 h-[480px] mistral-gradient opacity-90" />
        <div className="absolute inset-0 h-[480px] bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative pt-24 pb-32 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex max-w-2xl flex-col items-start space-y-6 border border-border bg-background/55 p-6 backdrop-blur-sm sm:p-8">
              <h1 className="text-5xl md:text-7xl font-medium tracking-tight text-foreground leading-[1.05]">
                Your AI future belongs in your hands.
              </h1>
              
              <p className="max-w-lg text-lg leading-relaxed text-foreground/80">
                Transform epub documents into dynamic multi-character podcasts. Powered by Mistral AI and ElevenLabs.
              </p>

              <div className="flex gap-4 pt-4">
                <Link 
                  href="/podcasts/new"
                  className="inline-flex h-11 items-center justify-center border-2 border-border bg-card/80 px-6 text-sm font-medium text-foreground transition-colors hover:bg-card"
                >
                  Get in touch
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link 
                  href="/characters"
                  className="mistral-gradient inline-flex h-11 items-center justify-center px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="mx-auto max-w-5xl px-6 py-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-start">
          {/* Left - scattered blocks + heading */}
          <div className="md:col-span-5 relative">
            <div className="space-y-6">
              <div className="flex gap-3">
                <div className="h-12 w-12 bg-mistral-gold" />
                <div className="h-12 w-20 bg-mistral-cream" />
              </div>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-[1.1]">
                Autonomous<br />production.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                Chat, search, analyze, create—do more in one connected hub.
              </p>
              <div className="flex gap-3 pt-4">
                <div className="h-10 w-10 bg-mistral-amber" />
                <div className="h-10 w-16 bg-mistral-cream" />
                <div className="h-10 w-10 bg-mistral-gold" />
              </div>
            </div>
          </div>

          {/* Right - feature list */}
          <div className="md:col-span-7 space-y-12">
            <div className="border-b border-border pb-8">
              <h3 className="text-2xl font-medium text-foreground mb-3">Generate podcast scripts from books.</h3>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Upload epub files, select chapters, and let Mistral AI write natural multi-character dialogue scripts.</p>
              </div>
            </div>
            <div className="border-b border-border pb-8">
              <h3 className="text-2xl font-medium text-foreground mb-3">Clone voices with audio samples.</h3>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Define character personalities, upload voice samples, and ElevenLabs creates unique cloned voices for each speaker.</p>
              </div>
            </div>
            <div className="border-b border-border pb-8">
              <h3 className="text-2xl font-medium text-foreground mb-3">Full audio synthesis pipeline.</h3>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Script generation, voice cloning, audio rendering, and mixing—all automated into a single downloadable podcast.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="mx-auto max-w-5xl px-6 pb-32 w-full">
        <h2 className="text-3xl font-medium tracking-tight text-foreground mb-12">
          How it works
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="group relative glass-panel p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-mono font-medium text-muted-foreground/40">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mb-4 text-xl font-medium text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

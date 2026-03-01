import Link from "next/link";
import { ArrowRight, Upload, Sparkles, Headphones } from "lucide-react";
import { ScienceLogoIcon } from "~/components/logo";

const steps = [
  {
    icon: ScienceLogoIcon,
    title: "Create Characters",
    description:
      "Define unique personalities and upload audio samples for voice cloning with ElevenLabs.",
  },
  {
    icon: Upload,
    title: "Upload a Book",
    description:
      "Drop in an epub file — chapters are extracted automatically, ready for podcast generation.",
  },
  {
    icon: Sparkles,
    title: "Generate Script",
    description:
      "Mistral AI writes a natural dialogue script based on your characters and chosen chapter.",
  },
  {
    icon: Headphones,
    title: "Listen & Share",
    description:
      "Each character speaks in their cloned voice. Download your podcast as a single MP3 file.",
  },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero with Mistral sunset gradient */}
      <section className="relative w-full overflow-hidden">
        <div className="mistral-gradient absolute inset-0 h-[480px] opacity-90" />
        <div className="to-background absolute inset-0 h-[480px] bg-gradient-to-b from-transparent via-transparent" />

        <div className="relative px-6 pt-24 pb-32">
          <div className="mx-auto max-w-5xl">
            <div className="border-border bg-background/55 flex max-w-2xl flex-col items-start space-y-6 border p-6 backdrop-blur-sm sm:p-8">
              <h1 className="text-foreground text-5xl leading-[1.05] font-medium tracking-tight md:text-7xl">
                Your AI future belongs in your hands.
              </h1>

              <p className="text-foreground/80 max-w-lg text-lg leading-relaxed">
                Transform epub documents into dynamic multi-character podcasts.
                Powered by Mistral AI and ElevenLabs.
              </p>

              <div className="flex gap-4 pt-4">
                <Link
                  href="/podcasts/new"
                  className="border-border bg-card/80 text-foreground hover:bg-card inline-flex h-11 items-center justify-center border-2 px-6 text-sm font-medium transition-colors"
                >
                  Get in touch
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/characters"
                  className="mistral-gradient text-primary-foreground inline-flex h-11 items-center justify-center px-6 text-sm font-medium transition-opacity hover:opacity-90"
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
      <section className="mx-auto w-full max-w-5xl px-6 py-24">
        <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-12">
          {/* Left - scattered blocks + heading */}
          <div className="relative md:col-span-5">
            <div className="space-y-6">
              <div className="flex gap-3">
                <div className="bg-mistral-gold h-12 w-12" />
                <div className="bg-mistral-cream h-12 w-20" />
              </div>
              <h2 className="text-foreground text-4xl leading-[1.1] font-medium tracking-tight md:text-5xl">
                Autonomous
                <br />
                production.
              </h2>
              <p className="text-muted-foreground max-w-sm text-lg leading-relaxed">
                Chat, search, analyze, create—do more in one connected hub.
              </p>
              <div className="flex gap-3 pt-4">
                <div className="bg-mistral-amber h-10 w-10" />
                <div className="bg-mistral-cream h-10 w-16" />
                <div className="bg-mistral-gold h-10 w-10" />
              </div>
            </div>
          </div>

          {/* Right - feature list */}
          <div className="space-y-12 md:col-span-7">
            <div className="border-border border-b pb-8">
              <h3 className="text-foreground mb-3 text-2xl font-medium">
                Generate podcast scripts from books.
              </h3>
              <div className="flex items-start gap-3">
                <ArrowRight className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-muted-foreground">
                  Upload epub files, select chapters, and let Mistral AI write
                  natural multi-character dialogue scripts.
                </p>
              </div>
            </div>
            <div className="border-border border-b pb-8">
              <h3 className="text-foreground mb-3 text-2xl font-medium">
                Clone voices with audio samples.
              </h3>
              <div className="flex items-start gap-3">
                <ArrowRight className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-muted-foreground">
                  Define character personalities, upload voice samples, and
                  ElevenLabs creates unique cloned voices for each speaker.
                </p>
              </div>
            </div>
            <div className="border-border border-b pb-8">
              <h3 className="text-foreground mb-3 text-2xl font-medium">
                Full audio synthesis pipeline.
              </h3>
              <div className="flex items-start gap-3">
                <ArrowRight className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-muted-foreground">
                  Script generation, voice cloning, audio rendering, and
                  mixing—all automated into a single downloadable podcast.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-32">
        <h2 className="text-foreground mb-12 text-3xl font-medium tracking-tight">
          How it works
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="group glass-panel hover:border-primary/30 relative p-8 transition-all duration-300 hover:shadow-lg"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="bg-secondary text-primary flex h-12 w-12 items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-muted-foreground/40 font-mono text-sm font-medium">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-foreground mb-4 text-xl font-medium">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

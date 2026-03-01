"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScienceLogoIcon } from "./logo";

const PixelMistralArt = () => (
  <svg
    width="100"
    height="60"
    viewBox="0 0 100 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mx-auto mb-8"
  >
    <rect x="10" y="0" width="10" height="10" fill="#FFD000" />
    <rect x="20" y="0" width="5" height="10" fill="#040404" />
    <rect x="35" y="0" width="10" height="10" fill="#FFD000" />
    <rect x="55" y="0" width="10" height="10" fill="#FFD000" />
    <rect x="75" y="0" width="5" height="10" fill="#040404" />
    <rect x="80" y="0" width="10" height="10" fill="#FFD000" />

    <rect x="10" y="10" width="15" height="10" fill="#FFAB00" />
    <rect x="55" y="10" width="15" height="10" fill="#FFAB00" />
    <rect x="75" y="10" width="15" height="10" fill="#FFAB00" />

    <rect x="10" y="20" width="80" height="10" fill="#FF8400" />

    <rect x="10" y="30" width="15" height="10" fill="#FF5C00" />
    <rect x="25" y="30" width="5" height="10" fill="#040404" />
    <rect x="40" y="30" width="20" height="10" fill="#FF5C00" />
    <rect x="70" y="30" width="5" height="10" fill="#040404" />
    <rect x="75" y="30" width="15" height="10" fill="#FF5C00" />

    <rect x="0" y="40" width="45" height="10" fill="#DC0000" />
    <rect x="55" y="40" width="45" height="10" fill="#DC0000" />
  </svg>
);

const PodcasterLogo = () => (
  <div className="flex items-center gap-2">
    <div className="text-foreground flex h-7 w-7 items-center justify-center">
      <ScienceLogoIcon className="h-5 w-5" />
    </div>
    <span className="text-foreground text-sm font-bold">
      Podcaster<span className="mistral-gradient-text">.ai</span>
    </span>
  </div>
);

export function Footer() {
  return (
    <section className="bg-background">
      {/* Gradient stripes */}
      <div className="footer-gradient h-24" />

      {/* Simple bottom bar */}
      <footer className="bg-mistral-gold py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
          <Link href="/">
            <PodcasterLogo />
          </Link>

          <p className="text-foreground/70 text-sm">Podcaster.ai &copy; 2026</p>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-foreground hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-foreground hover:text-primary transition-colors"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </section>
  );
}

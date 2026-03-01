"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { BookOpen, Home, Plus, Sun, Moon, Mic2 } from "lucide-react";
import { ScienceLogoIcon } from "./logo";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/characters", label: "Characters", icon: Mic2 },
  { href: "/podcasts", label: "Library", icon: BookOpen },
];

export function Nav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="bg-background/90 border-border sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="group flex items-center gap-3">
              <div className="text-foreground flex h-8 w-8 items-center justify-center transition-transform group-hover:scale-105">
                <ScienceLogoIcon className="h-6 w-6" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Podcaster<span className="mistral-gradient-text">.ai</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-bold tracking-wide uppercase transition-all duration-200 border border-transparent",
                      isActive
                        ? "text-primary border-primary/20 bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="border-border bg-card text-muted-foreground hover:text-foreground hover:bg-primary/5 flex h-9 w-9 items-center justify-center border transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            )}

            <Link
              href="/podcasts/new"
              className="hidden sm:inline-flex h-9 items-center justify-center bg-card border border-border px-4 text-xs font-bold uppercase tracking-wider text-foreground shadow-[2px_2px_0px_0px_var(--color-mistral-orange)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-mistral-orange)]"
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Task
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

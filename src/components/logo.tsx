import type { SVGProps } from "react";

export function ScienceLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Radio Waves Left */}
      <path d="M 28 35 A 18 18 0 0 0 28 65" />
      <path d="M 20 28 A 28 28 0 0 0 20 72" />
      <path d="M 12 21 A 38 38 0 0 0 12 79" />

      {/* Radio Waves Right */}
      <path d="M 72 35 A 18 18 0 0 1 72 65" />
      <path d="M 80 28 A 28 28 0 0 1 80 72" />
      <path d="M 88 21 A 38 38 0 0 1 88 79" />

      {/* Atom */}
      <circle cx="50" cy="20" r="3" fill="currentColor" />
      <ellipse cx="50" cy="20" rx="14" ry="5" transform="rotate(0 50 20)" />
      <ellipse cx="50" cy="20" rx="14" ry="5" transform="rotate(60 50 20)" />
      <ellipse cx="50" cy="20" rx="14" ry="5" transform="rotate(120 50 20)" />
      {/* Electrons */}
      <circle cx="64" cy="20" r="1.5" fill="currentColor" />
      <circle cx="43" cy="8" r="1.5" fill="currentColor" />
      <circle cx="43" cy="32" r="1.5" fill="currentColor" />

      {/* Circuit Trunks emerging from cube top */}
      {/* Main center line */}
      <line x1="50" y1="52" x2="50" y2="40" />
      <circle cx="50" cy="40" r="1.5" fill="currentColor" />

      {/* Inner branches */}
      <path d="M 45 54 L 45 42 L 38 35" />
      <circle cx="38" cy="35" r="1.5" fill="currentColor" />

      <path d="M 55 54 L 55 42 L 62 35" />
      <circle cx="62" cy="35" r="1.5" fill="currentColor" />

      {/* Outer branches */}
      <path d="M 40 57 L 40 48 L 32 40" />
      <circle cx="32" cy="40" r="1.5" fill="currentColor" />

      <path d="M 60 57 L 60 48 L 68 40" />
      <circle cx="68" cy="40" r="1.5" fill="currentColor" />

      {/* Extreme outer branches */}
      <path d="M 35 60 L 35 55 L 25 45" />
      <circle cx="25" cy="45" r="1.5" fill="currentColor" />

      <path d="M 65 60 L 65 55 L 75 45" />
      <circle cx="75" cy="45" r="1.5" fill="currentColor" />

      {/* Bottom Hexagon/Cube Outer */}
      <polygon points="50,115 20,98 20,63 50,46 80,63 80,98" />
      <polyline points="20,63 50,80 80,63" />
      <line x1="50" y1="115" x2="50" y2="80" />

      {/* Inner Cube */}
      <polygon points="50,102 32,88 32,69 50,55 68,69 68,88" />
      <polyline points="32,69 50,79 68,69" />
      <line x1="50" y1="102" x2="50" y2="79" />

      {/* Innermost Cube */}
      <polygon points="50,90 41,81 41,69 50,60 59,69 59,81" />
      <polyline points="41,69 50,75 59,69" />
      <line x1="50" y1="90" x2="50" y2="75" />
    </svg>
  );
}

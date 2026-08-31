type LogoProps = {
  /** Accessible name. Arrives as a prop — the mark names nobody (R1). */
  title: string
  size?: number
}

/**
 * The app mark.
 *
 * The same three-bar monogram the favicon and the home-screen icon are drawn
 * from, so the browser tab and the page carry one identity rather than two.
 * That file (src/lib/brand/Mark.tsx) renders through Satori at build time and
 * cannot be a React element here; the geometry below is deliberately the same
 * 32-unit grid, bar for bar.
 *
 * Boxes rather than a glyph: at sixteen pixels a letterform made of solid
 * bars survives, and it does not depend on a font having loaded.
 *
 * Server Component — no behaviour, so it ships no JavaScript.
 */
export function Logo({ title, size = 38 }: LogoProps) {
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="logo-ink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-bright)" />
          <stop offset="55%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-glow)" />
        </linearGradient>
        <linearGradient id="logo-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-surface-raised)" />
          <stop offset="100%" stopColor="var(--color-ground)" />
        </linearGradient>
      </defs>

      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="9"
        fill="url(#logo-plate)"
        stroke="url(#logo-ink)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />

      {/* The monogram: stem, top arm, shorter middle arm. */}
      <g fill="url(#logo-ink)">
        <rect x="7" y="5" width="5" height="22" rx="1.2" />
        <rect x="12" y="5" width="13" height="5" rx="1.2" />
        <rect x="12" y="14" width="9" height="5" rx="1.2" />
      </g>
    </svg>
  )
}

type LogoProps = {
  /** Accessible name. Arrives as a prop — the mark names nobody (R1). */
  title: string
  size?: number
}

/**
 * The app mark: a continuous loop.
 *
 * Abstract rather than a monogram. An initial says whose site this is, which
 * the page already says louder; a symbol says what kind of thing it is. The
 * lemniscate reads as a closed circuit — a signal going round — with a node
 * at the crossing where the two halves meet, which is the site's whole
 * subject in one shape.
 *
 * Drawn as a single stroked path so it stays legible at sixteen pixels and
 * never waits on a font. The same shape is drawn again in Mark.tsx for the
 * favicon and home-screen icon, so tab and page carry one identity.
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
          <stop offset="52%" stopColor="var(--color-accent)" />
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
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />

      {/*
        One unbroken stroke: out to the left lobe, across the middle, out to
        the right, and back. Cubic curves rather than two circles, so the
        crossing is a real crossing and not two shapes meeting.
      */}
      <path
        d="M16 16
           C 13.2 11.4, 8.4 11.4, 7.2 14.6
           C 6.2 17.4, 8.4 20.6, 11.4 20.6
           C 14.2 20.6, 15.2 18.2, 16 16
           C 16.8 13.8, 17.8 11.4, 20.6 11.4
           C 23.6 11.4, 25.8 14.6, 24.8 17.4
           C 23.6 20.6, 18.8 20.6, 16 16 Z"
        fill="none"
        stroke="url(#logo-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The node at the crossing. */}
      <circle cx="16" cy="16" r="1.9" fill="var(--color-accent-glow)" />
    </svg>
  )
}

type BrandMarkProps = {
  /** Accessible name — the technology, exactly as the CV writes it. */
  title: string
  /** Single-path SVG geometry on a 24-unit grid (Simple Icons). */
  path: string
  /** The brand's own colour. */
  hex: string
  size?: number
}

/** Relative luminance, per WCAG. `hex` is always `#rrggbb` — the schema checks. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/**
 * Below this, a brand's own colour disappears into the page.
 *
 * Several marks are pure black by specification — Next.js and Apple among
 * them — and a black logo on a midnight ground is an invisible logo. Rather
 * than keeping a list of exceptions, the rule is measured: anything this dark
 * inherits the page's ink instead.
 */
const TOO_DARK = 0.05

/**
 * One technology logo.
 *
 * Simple Icons are all a single path on a 24×24 grid, which is why this can
 * be one element rather than a component per brand. Geometry and colour both
 * arrive as props from the content layer — this file names no technology and
 * knows no brand (R1).
 *
 * Server Component: no behaviour, so it ships no JavaScript.
 */
export function BrandMark({ title, path, hex, size = 30 }: BrandMarkProps) {
  const invisible = luminance(hex) < TOO_DARK

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={invisible ? 'currentColor' : hex}
      className="text-ink shrink-0"
    >
      <path d={path} />
    </svg>
  )
}

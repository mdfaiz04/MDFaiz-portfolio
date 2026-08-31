import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The design tokens, read from the stylesheet that defines them.
 *
 * The Open Graph image and the browser theme colour both need the palette in
 * TypeScript, and globals.css is where the palette lives (R2). Copying three
 * hex codes into a constants file would work today and drift the first time
 * the design is retuned — so this parses the real source instead.
 *
 * BUILD TIME ONLY. Every consumer is a statically generated route or a
 * server-rendered `<meta>` tag, so the file read happens once during
 * `next build` and never in a browser.
 */

const THEME_BLOCK = /@theme\s*\{([\s\S]*?)\n\}/
const TOKEN = /--(color-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g

function readTokens(): Map<string, string> {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const block = THEME_BLOCK.exec(css)?.[1]

  if (block === undefined) {
    throw new Error(
      'No @theme block found in src/app/globals.css — the palette cannot be read.',
    )
  }

  const tokens = new Map<string, string>()
  for (const [, name, value] of block.matchAll(TOKEN)) {
    if (name && value) tokens.set(name, value)
  }

  return tokens
}

const tokens = readTokens()

/**
 * One colour by token name, e.g. `colour('color-accent')`.
 *
 * Throws rather than falling back. A silently missing colour would ship an
 * Open Graph card with black text on a black background, and nobody would
 * notice until a recruiter shared the link.
 */
export function colour(name: string): string {
  const value = tokens.get(name)

  if (value === undefined) {
    throw new Error(
      `Unknown design token "--${name}". Defined tokens: ${[...tokens.keys()]
        .map((key) => `--${key}`)
        .join(', ')}`,
    )
  }

  return value
}

/** The named colours the brand surfaces outside CSS actually use. */
export const palette = {
  ground: colour('color-ground'),
  groundDeep: colour('color-ground-deep'),
  surface: colour('color-surface'),
  ink: colour('color-ink'),
  inkMuted: colour('color-ink-muted'),
  inkFaint: colour('color-ink-faint'),
  accent: colour('color-accent'),
  accentBright: colour('color-accent-bright'),
  accentGlow: colour('color-accent-glow'),
  rule: colour('color-rule'),
} as const

export type Palette = typeof palette

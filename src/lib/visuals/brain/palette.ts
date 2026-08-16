/**
 * Canvas cannot read CSS custom properties, and hard-coding colours here
 * would put the hero outside the token system (R2) — the one element on the
 * page that ignores the design system.
 *
 * Instead the renderer reads the computed token values off its host element.
 * Change a token in globals.css and the brain recolours with everything else.
 */

export type BrainPalette = {
  point: string
  pointFar: string
  edge: string
  pulse: string
  ring: string
}

/**
 * Fallbacks exist only for the instant before styles resolve. They mirror the
 * Nocturne tokens; if they ever visibly appear, a token name has been
 * renamed and the real fix is in globals.css.
 */
const FALLBACK: BrainPalette = {
  point: '#9b8cff',
  pointFar: '#4a32b8',
  edge: '#7c5cff',
  pulse: '#35d6f5',
  ring: '#7c5cff',
}

const TOKENS: Record<keyof BrainPalette, string> = {
  point: '--color-accent-bright',
  pointFar: '--color-accent-deep',
  edge: '--color-accent',
  pulse: '--color-accent-glow',
  ring: '--color-accent',
}

export function readBrainPalette(host: Element): BrainPalette {
  const styles = getComputedStyle(host)

  const read = (key: keyof BrainPalette): string => {
    const value = styles.getPropertyValue(TOKENS[key]).trim()
    return value === '' ? FALLBACK[key] : value
  }

  return {
    point: read('point'),
    pointFar: read('pointFar'),
    edge: read('edge'),
    pulse: read('pulse'),
    ring: read('ring'),
  }
}

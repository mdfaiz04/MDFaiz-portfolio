/**
 * Canvas cannot read CSS custom properties, and hard-coding colours here
 * would put the hero outside the token system (R2) — the one element on the
 * page that ignores the design system.
 *
 * Instead the renderer reads the computed token values off its host element,
 * so changing a token in globals.css recolours the scene with everything else.
 */

export type ScenePalette = {
  /** Nearest points, close to white. */
  near: string
  /** Mid-depth body colour. */
  mid: string
  /** Far side — recedes without vanishing. */
  far: string
  edge: string
  pulse: string
  /** Ambient bloom behind the whole cloud. */
  halo: string
  /** The lit platform below. */
  base: string
  /**
   * Material colours, as opposed to light.
   *
   * The point cloud is made entirely of light and needed none of these. The
   * hero scene has a solid object in it, and a solid object needs a surface
   * to catch light on — rendered additively like everything else it just
   * glows, which is exactly what makes a render look like a cartoon.
   */
  shell: string
  shellDeep: string
  rule: string
}

export type Rgb = { r: number; g: number; b: number }

/** Only used in the instant before styles resolve. */
const FALLBACK: ScenePalette = {
  near: '#e8fbff',
  mid: '#4bc9f5',
  far: '#4733b0',
  edge: '#5aa9ff',
  pulse: '#ffffff',
  halo: '#6b5cff',
  base: '#35d6f5',
  shell: '#1a1a38',
  shellDeep: '#06060f',
  rule: '#26264a',
}

const TOKENS: Record<keyof ScenePalette, string> = {
  near: '--color-scene-near',
  mid: '--color-scene-mid',
  far: '--color-scene-far',
  edge: '--color-scene-edge',
  pulse: '--color-scene-pulse',
  halo: '--color-scene-halo',
  base: '--color-scene-base',
  shell: '--color-surface-raised',
  shellDeep: '--color-ground-deep',
  rule: '--color-rule',
}

export function readScenePalette(host: Element): ScenePalette {
  const styles = getComputedStyle(host)

  const read = (key: keyof ScenePalette): string => {
    const value = styles.getPropertyValue(TOKENS[key]).trim()
    return value === '' ? FALLBACK[key] : value
  }

  return {
    near: read('near'),
    mid: read('mid'),
    far: read('far'),
    edge: read('edge'),
    pulse: read('pulse'),
    halo: read('halo'),
    base: read('base'),
    shell: read('shell'),
    shellDeep: read('shellDeep'),
    rule: read('rule'),
  }
}

/**
 * Parse `#rgb` / `#rrggbb` into channels so depth can be interpolated
 * numerically. Anything unparseable falls back to mid grey rather than
 * throwing inside a render loop.
 */
export function toRgb(colour: string): Rgb {
  const hex = colour.trim().replace('#', '')

  if (hex.length === 3) {
    const r = hex[0]
    const g = hex[1]
    const b = hex[2]
    if (r && g && b) {
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
      }
    }
  }

  if (hex.length >= 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }

  return { r: 128, g: 128, b: 128 }
}

/** Linear blend, `t` clamped to 0…1. */
export function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  const amount = t < 0 ? 0 : t > 1 ? 1 : t
  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  }
}

export function rgbaString({ r, g, b }: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${alpha})`
}

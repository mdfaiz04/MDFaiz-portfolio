import type { Transition, Variants } from 'motion/react'

/**
 * L3 — the motion layer.
 *
 * Every duration, delay, stagger, spring, and particle count in the project
 * lives here. A bare number inside an animation prop fails lint (R3), so the
 * feel of the entire site is tunable from this one file rather than from
 * twenty components that have each drifted slightly.
 *
 * Values mirror the CSS custom properties in globals.css. CSS transitions
 * read those; Framer Motion reads these. One vocabulary, two consumers.
 */

/** Seconds, because Framer Motion works in seconds. CSS uses milliseconds. */
export const duration = {
  instant: 0.15,
  fast: 0.28,
  base: 0.45,
  slow: 0.7,
  ambient: 1.2,
} as const

export const ease = {
  /** Decisive arrival — the default for anything entering. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetrical, for things that move and settle in place. */
  inOut: [0.65, 0, 0.35, 1],
} as const

export const spring = {
  /** Interface response: buttons, indicators, pointer-following. */
  responsive: { type: 'spring', stiffness: 260, damping: 28 },
  /** Softer, for larger objects that should feel weighty. */
  weighted: { type: 'spring', stiffness: 140, damping: 24 },
} as const satisfies Record<string, Transition>

export const stagger = {
  tight: 0.04,
  base: 0.06,
  loose: 0.09,
} as const

/** Scroll-triggered reveals. */
export const reveal = {
  /** How far an element travels on entry, in pixels. */
  distance: 24,
  /** Fraction of the element that must be visible before it fires. */
  amount: 0.25,
  /** Reveals happen once. Replaying on every scroll-past reads as a gimmick. */
  once: true,
} as const

/** The hero neural point cloud (Phase 3). */
export const brain = {
  /** Radians per frame — one full rotation in roughly 42 seconds. */
  rotationSpeed: 0.0025,
  /**
   * Density is what makes the cloud read as an organ rather than as
   * scattered specks. Mobile takes roughly half, since the canvas is
   * smaller and the device has less to give.
   */
  pointCount: { desktop: 900, mobile: 420 },
  /** Hard cap on drawn synapses; the limiting factor for frame rate. */
  edgeCap: { desktop: 1500, mobile: 700 },
  /** Milliseconds between signal pulses travelling an edge. */
  pulseInterval: 520,
  /** Maximum cursor parallax, in degrees. */
  parallaxDeg: 7,
  /** Retina is worth it; beyond 2x is invisible and expensive. */
  dprCap: 2,
} as const

/** The portfolio assistant (Phase 5). */
export const typewriter = {
  /** Milliseconds per character. */
  charDelay: 18,
  /** A brief considered pause before answering. */
  thinkingPause: 300,
} as const

// ---------------------------------------------------------------------------
// Shared variants
// ---------------------------------------------------------------------------

/**
 * Standard entrance. `reduced` is not a shortened version — it is a genuinely
 * static alternative, which is what "prefers reduced motion" actually asks
 * for.
 */
export function fadeUp(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0 },
    }
  }

  return {
    hidden: { opacity: 0, y: reveal.distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: duration.base, ease: ease.out },
    },
  }
}

/** Parent that releases its children in sequence. */
export function staggerParent(
  reduced: boolean,
  step: number = stagger.base,
): Variants {
  return {
    hidden: {},
    visible: {
      transition: reduced ? {} : { staggerChildren: step },
    },
  }
}

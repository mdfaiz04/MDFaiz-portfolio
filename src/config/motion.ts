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
  /**
   * Fires as soon as any part of the element enters, pulled in from the
   * bottom so it triggers just before the element is fully in view.
   *
   * Deliberately NOT a ratio threshold: a section taller than the viewport
   * can never reach a 25% ratio, so a percentage threshold leaves exactly
   * the largest sections permanently hidden.
   */
  threshold: 0,
  rootMargin: '0px 0px -12% 0px',
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
  pointCount: { desktop: 1100, mobile: 320 },
  /** Hard cap on drawn synapses; the limiting factor for frame rate. */
  edgeCap: { desktop: 2000, mobile: 520 },
  /** Milliseconds between signal pulses travelling an edge. */
  pulseInterval: 520,
  /**
   * No cursor interaction: the brain turns on its own and ignores the
   * pointer. Removed by request after the orbit proved distracting.
   */
  /** Retina is worth it; beyond 2x is invisible and expensive. */
  dprCap: 2,
  /**
   * Minimum milliseconds between rendered frames.
   *
   * Zero on a desktop: render every frame the browser offers. On a phone the
   * loop was costing about 65ms per frame under CPU throttling — enough long
   * tasks, back to back, to keep the browser from answering a tap. Thirty
   * frames a second is indistinguishable for a slow rotation and halves the
   * work. Rotation speed is unaffected: skipped time is accumulated and
   * handed to the next frame.
   */
  frameInterval: { desktop: 0, mobile: 1000 / 30 },
  /**
   * How long the model may wait for an idle moment before it is built
   * anyway. Long enough to stay out of the way of first interaction, short
   * enough that a busy page still shows its hero.
   */
  buildTimeout: 2500,
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

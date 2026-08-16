'use client'

import { motion, useScroll, useSpring } from 'motion/react'

import { spring } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * A hairline reading-progress bar across the top of the page.
 *
 * `useScroll` drives a motion value directly, so the bar updates on the
 * compositor without a React render per frame — the difference between smooth
 * and janky on a long animated page.
 *
 * Hidden entirely under reduced motion: a bar that tracks scrolling is
 * movement, and there is no static equivalent worth showing.
 */
export function ScrollProgress() {
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, spring.responsive)

  if (reduced) return null

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="from-accent to-accent-glow fixed inset-x-0 top-0 z-60 h-px origin-left bg-gradient-to-r"
    />
  )
}

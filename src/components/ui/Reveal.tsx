'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { fadeUp, reveal, staggerParent } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type RevealProps = {
  children: ReactNode
  /** Release children in sequence instead of animating as one block. */
  stagger?: boolean
  className?: string
}

/**
 * Scroll-triggered entrance.
 *
 * Every timing value comes from config/motion.ts, and the whole effect is
 * gated on the reduced-motion preference — where it renders a genuinely
 * static, complete element rather than a faster animation.
 */
export function Reveal({ children, stagger = false, className }: RevealProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: reveal.once, amount: reveal.amount }}
      variants={stagger ? staggerParent(reduced) : fadeUp(reduced)}
    >
      {children}
    </motion.div>
  )
}

/** A single item inside a `<Reveal stagger>`. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div className={className} variants={fadeUp(reduced)}>
      {children}
    </motion.div>
  )
}

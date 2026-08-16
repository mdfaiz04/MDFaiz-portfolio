'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef } from 'react'

import { spring } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/** How far the button may lean towards the cursor, as a fraction of its size. */
const PULL = 0.22

type MagneticButtonProps = {
  href: string
  children: ReactNode
  /** Filled uses the accent; outline is the quieter second action. */
  variant?: 'filled' | 'outline'
  external?: boolean
}

/**
 * A link that leans towards the cursor while hovered.
 *
 * The effect is deliberately small — enough to feel responsive, not enough to
 * be a toy. It uses transform only, so it never triggers layout, and it is
 * disabled entirely under reduced motion.
 *
 * Pointer tracking is skipped on touch devices, where there is no hover state
 * to respond to.
 */
export function MagneticButton({
  href,
  children,
  variant = 'filled',
  external = false,
}: MagneticButtonProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLAnchorElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, spring.responsive)
  const y = useSpring(rawY, spring.responsive)

  function handleMove(event: React.PointerEvent<HTMLAnchorElement>) {
    if (reduced || event.pointerType !== 'mouse') return

    const element = ref.current
    if (!element) return

    const box = element.getBoundingClientRect()
    rawX.set((event.clientX - (box.left + box.width / 2)) * PULL)
    rawY.set((event.clientY - (box.top + box.height / 2)) * PULL)
  }

  function handleLeave() {
    rawX.set(0)
    rawY.set(0)
  }

  const base =
    'inline-flex items-center gap-2 rounded-edge px-6 py-3 font-mono text-xs tracking-widest uppercase transition-colors duration-fast'

  const skin =
    variant === 'filled'
      ? 'bg-accent text-ink hover:bg-accent-bright'
      : 'border border-rule text-ink-muted hover:border-accent hover:text-ink'

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x, y }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`${base} ${skin}`}
      {...(external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : undefined)}
    >
      {children}
    </motion.a>
  )
}

'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { reveal } from '@/config/motion'

type RevealProps = {
  children: ReactNode
  /** Release children in sequence instead of animating as one block. */
  stagger?: boolean
  /** A clip-path wipe instead of a rise. */
  wipe?: boolean
  className?: string
}

/**
 * Scroll-triggered entrance.
 *
 * The visual states live in CSS (see globals.css); this only observes the
 * element and adds `is-visible` when it enters the viewport. That split is
 * deliberate: the hidden start state is scoped to `.js`, so content is
 * readable even when JavaScript never runs. An earlier version animated with
 * Framer Motion and rendered `opacity: 0` on the server, which meant a
 * failed bundle blanked every section below the hero.
 *
 * It also removes an animation library from the render path of most of the
 * page — this is a transition, and CSS does transitions well.
 */
export function Reveal({
  children,
  stagger = false,
  wipe = false,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue

          entry.target.classList.add('is-visible')
          // Reveals happen once; replaying on every scroll-past reads as a
          // gimmick and makes long pages restless.
          if (reveal.once) observer.unobserve(entry.target)
        }
      },
      { threshold: reveal.threshold, rootMargin: reveal.rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const attribute = wipe
    ? { 'data-reveal-wipe': '' }
    : stagger
      ? { 'data-reveal-stagger': '' }
      : { 'data-reveal': '' }

  return (
    <div ref={ref} className={className} {...attribute}>
      {children}
    </div>
  )
}

/**
 * A single item inside a `<Reveal stagger>`. It carries no behaviour — the
 * parent's CSS drives the sequence — but keeps call sites explicit about
 * which elements are staggered.
 */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}

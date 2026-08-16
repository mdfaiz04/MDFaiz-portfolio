'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'

import { duration, ease, spring } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useScrollSpy } from '@/hooks/useScrollSpy'

type NavItem = {
  id: string
  navLabel: string
}

type NavProps = {
  /** Comes from the section registry — this component never declares links. */
  items: readonly NavItem[]
  wordmark: string
}

/**
 * Site navigation, generated in full from the section registry.
 *
 * There is no hard-coded list of links anywhere in this file. Disabling a
 * section in src/content/sections.ts removes it from the nav, the page, the
 * scroll-spy and the footer in a single edit.
 *
 * The active indicator is a shared `layoutId`, so it slides between items
 * rather than fading — one continuous object moving, which reads as a
 * mechanism rather than an effect.
 */
export function Nav({ items, wordmark }: NavProps) {
  const reduced = useReducedMotion()
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const activeId = useScrollSpy(ids)

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Primary"
        className="border-rule-soft/60 bg-ground/70 mx-auto flex max-w-6xl items-center justify-between border-b px-gutter py-4 backdrop-blur-md"
      >
        <a
          href="#top"
          className="text-ink font-mono text-sm font-bold tracking-tight"
        >
          {wordmark}
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const isActive = item.id === activeId

            return (
              <li key={item.id} className="relative">
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative block px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors duration-fast ${
                    isActive
                      ? 'text-ink'
                      : 'text-ink-faint hover:text-ink-muted'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="bg-surface-raised border-rule absolute inset-0 -z-10 rounded-edge border"
                      transition={
                        reduced
                          ? { duration: duration.instant, ease: ease.out }
                          : spring.responsive
                      }
                    />
                  )}
                  {item.navLabel}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

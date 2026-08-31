'use client'

import { motion } from 'motion/react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
  /** The name, already split: the first word is set in gradient. */
  wordmark: { lead: string; rest: string }
  /** Where the standing call to action points, and what it says. */
  action: { label: string; sectionId: string }
}

/**
 * Site navigation, generated in full from the section registry.
 *
 * There is no hard-coded list of links anywhere in this file. Disabling a
 * section in src/content/sections.ts removes it from the nav, the page, the
 * scroll-spy, the mobile menu and the footer in a single edit.
 *
 * The desktop active indicator is a shared `layoutId`, so it slides between
 * items rather than fading — one continuous object moving, which reads as a
 * mechanism rather than an effect.
 */
export function Nav({ items, wordmark, action }: NavProps) {
  const reduced = useReducedMotion()
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const activeId = useScrollSpy(ids)
  const [menuOpen, setMenuOpen] = useState(false)

  // Escape closes the menu, which is the behaviour a keyboard user expects
  // from anything that opens over the page.
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Primary"
        className="border-rule-soft/60 bg-ground/70 mx-auto flex max-w-shell items-center justify-between border-b px-gutter py-4 backdrop-blur-md"
      >
        <a
          href="#top"
          className="font-display text-lg font-extrabold tracking-tight"
          onClick={() => setMenuOpen(false)}
        >
          <span className="text-gradient">{wordmark.lead}</span>{' '}
          <span className="text-ink">{wordmark.rest}</span>
        </a>

        {/* Desktop */}
        <ul className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const isActive = item.id === activeId

            return (
              <li key={item.id} className="relative">
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative block px-4 py-2 text-sm font-medium transition-colors duration-fast ${
                    isActive
                      ? 'text-accent-bright'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      // An underline, not a plate: it reads as the page's
                      // position marker rather than as a selected button.
                      className="bg-accent-bright absolute inset-x-3 -bottom-0.5 h-0.5 rounded-pill"
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

        <div className="flex items-center gap-2">
          <a
            href={`#${action.sectionId}`}
            className="border-accent/60 text-ink hover:bg-accent-solid hidden items-center gap-1.5 rounded-tile border px-4 py-2 text-sm font-semibold transition-colors duration-fast md:inline-flex"
          >
            {action.label}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="border-rule text-ink-muted hover:border-accent hover:text-ink rounded-tile border p-2 transition-colors duration-fast md:hidden"
          >
            {menuOpen ? (
              <X size={18} aria-hidden="true" />
            ) : (
              <Menu size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile panel. Rendered but hidden rather than unmounted, so the
          markup stays in the document for assistive technology and the
          transition has something to animate. */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="border-rule-soft/60 bg-ground/95 mx-auto max-w-shell border-b px-gutter pb-4 backdrop-blur-md md:hidden"
      >
        <ul className="flex flex-col">
          {items.map((item) => {
            const isActive = item.id === activeId

            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`border-rule-soft block border-b py-3 text-sm font-medium transition-colors duration-fast ${
                    isActive ? 'text-accent-bright' : 'text-ink-muted'
                  }`}
                >
                  {item.navLabel}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </header>
  )
}

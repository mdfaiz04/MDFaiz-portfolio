'use client'

import { motion } from 'motion/react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Logo } from '@/components/ui/Logo'
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
  /** Accessible name for the mark. The component itself names nobody (R1). */
  owner: string
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
export function Nav({ items, owner, action }: NavProps) {
  const reduced = useReducedMotion()
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const activeId = useScrollSpy(ids)
  const [menuOpen, setMenuOpen] = useState(false)

  /**
   * Whether the page has scrolled away from the top.
   *
   * The bar is transparent over the hero and becomes a solid surface once
   * content starts passing beneath it. At a fixed 70% it did neither: hero
   * text showed through the blur as a smear, which reads as a rendering
   * fault rather than as a design.
   */
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)

    onScroll()
    // Passive: this never calls preventDefault, and saying so lets the
    // browser scroll without waiting on the handler.
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-fast ${
        scrolled || menuOpen
          ? 'border-rule-soft/70 bg-ground/95 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-shell items-center justify-between px-gutter py-4"
      >
        <a
          href="#top"
          className="hover:opacity-80 inline-flex items-center transition-opacity duration-fast"
          onClick={() => setMenuOpen(false)}
        >
          <Logo title={owner} />
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
        className="mx-auto max-w-shell px-gutter pb-4 md:hidden"
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

'use client'

import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

type ThemeToggleProps = {
  /** Accessible names. The component states nothing of its own (R1). */
  toDark: string
  toLight: string
}

/** The attribute the stylesheet keys off, and the key it is remembered under. */
const ATTRIBUTE = 'data-theme'
const STORAGE_KEY = 'theme'

/**
 * The document element IS the store.
 *
 * An inline script in the layout sets the theme before first paint, so by the
 * time this component exists the answer is already on the page. Holding a
 * copy in React state would mean writing it back on mount — which the rules
 * of hooks rightly reject, and which would flash the wrong icon for a frame.
 * Subscribing to the attribute instead means the button is correct on its
 * first render and stays correct if anything else ever changes the theme.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ATTRIBUTE],
  })
  return () => observer.disconnect()
}

function readTheme() {
  return document.documentElement.getAttribute(ATTRIBUTE) === 'light'
}

/** Dark on the server: it is the default, and the script corrects it first. */
function readServerTheme() {
  return false
}

/**
 * Dark and light, remembered.
 *
 * Absent a stored choice the system preference wins, and keeps winning — the
 * button only pins a theme once somebody actually presses it.
 */
export function ThemeToggle({ toDark, toLight }: ThemeToggleProps) {
  const isLight = useSyncExternalStore(subscribe, readTheme, readServerTheme)

  function toggle() {
    const next = isLight ? 'dark' : 'light'
    document.documentElement.setAttribute(ATTRIBUTE, next)

    // A private window can refuse storage. Losing the preference is a small
    // thing; throwing on click is not.
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignored on purpose.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? toDark : toLight}
      className="border-rule text-ink-muted hover:border-accent hover:text-ink flex size-10 shrink-0 items-center justify-center rounded-tile border transition-colors duration-fast"
    >
      {/*
        The mark shows what pressing it DOES, not what is currently on: a moon
        while the page is light means "go dark", which is what the label says
        too. An icon describing the state while the label describes the action
        is the classic way these two disagree.

        Both are rendered with one hidden, rather than swapping which is
        mounted, so the button never changes size and there is nothing to lay
        out on the first press.
      */}
      <span hidden={!isLight}>
        <Moon size={17} aria-hidden="true" />
      </span>
      <span hidden={isLight}>
        <Sun size={17} aria-hidden="true" />
      </span>
    </button>
  )
}

'use client'

import { useEffect, useState } from 'react'

/**
 * Reports which section is currently in view, for the nav indicator.
 *
 * Uses IntersectionObserver rather than a scroll listener: the browser does
 * the work off the main thread, so scrolling stays smooth no matter how much
 * else is animating.
 *
 * The root margin biases detection towards the upper-middle of the viewport,
 * so the indicator changes when a section *feels* current rather than the
 * instant one pixel of it appears.
 */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    if (ids.length === 0) return

    const visible = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio)
          } else {
            visible.delete(entry.target.id)
          }
        }

        if (visible.size === 0) return

        // Most-visible wins; ties resolve to document order.
        let best: string | null = null
        let bestRatio = -1

        for (const id of ids) {
          const ratio = visible.get(id)
          if (ratio !== undefined && ratio > bestRatio) {
            best = id
            bestRatio = ratio
          }
        }

        if (best !== null) setActiveId(best)
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [ids])

  return activeId
}

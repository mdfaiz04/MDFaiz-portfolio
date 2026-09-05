'use client'

import { useEffect } from 'react'

/** The properties the stylesheet reads to place a card's highlight. */
const X = '--pointer-x'
const Y = '--pointer-y'

/**
 * One listener for every cursor-lit surface on the page.
 *
 * Each card could track its own pointer, and the projects list used to. But
 * a handler per card means a handler per card mounted — thirty listeners on
 * this page — all doing the same arithmetic. One listener on the window that
 * asks `closest('[data-glow]')` where the pointer is costs the same as one
 * card's would, no matter how many cards exist, and a new lit surface then
 * needs only the attribute in its markup.
 *
 * Three things keep it cheap:
 *
 *   - Work happens on an animation frame, not per event. A mouse can emit
 *     several hundred `pointermove` events a second; the screen updates at
 *     sixty.
 *   - The element's box is measured only when the pointer crosses into a
 *     different card, or after the page has scrolled or resized. Reading a
 *     bounding box forces layout, so doing it every frame would be the one
 *     expensive part of an otherwise free effect.
 *   - It writes custom properties rather than React state, so a moving mouse
 *     never renders a component.
 *
 * Nothing is attached on a touch screen or for a visitor who has asked for
 * less motion — in both cases the effect either cannot be seen or should not
 * be shown, and the listener would be pure cost.
 */
export function PointerField() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || still.matches) return

    let frame = 0
    let pointerX = 0
    let pointerY = 0
    let lit: HTMLElement | null = null
    let box: DOMRect | null = null

    function paint() {
      frame = 0
      if (!lit) return

      // Re-measure only when we have no box: on entering a card, and after
      // anything that could have moved it.
      box ??= lit.getBoundingClientRect()
      lit.style.setProperty(X, `${pointerX - box.left}px`)
      lit.style.setProperty(Y, `${pointerY - box.top}px`)
    }

    function track(event: PointerEvent) {
      pointerX = event.clientX
      pointerY = event.clientY

      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-glow]')
          : null

      if (target !== lit) {
        lit = target
        box = null
      }

      if (lit && frame === 0) frame = requestAnimationFrame(paint)
    }

    function invalidate() {
      box = null
    }

    window.addEventListener('pointermove', track, { passive: true })
    window.addEventListener('scroll', invalidate, { passive: true })
    window.addEventListener('resize', invalidate, { passive: true })

    return () => {
      window.removeEventListener('pointermove', track)
      window.removeEventListener('scroll', invalidate)
      window.removeEventListener('resize', invalidate)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [])

  // Behaviour only. It renders nothing, so it costs no markup and no layout.
  return null
}

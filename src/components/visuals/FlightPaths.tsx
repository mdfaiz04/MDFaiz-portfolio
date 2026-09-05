'use client'

import { useEffect, useRef } from 'react'

import { scene } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { createFlightRenderer, type FlightRenderer } from '@/lib/visuals/flight'
import { readScenePalette } from '@/lib/visuals/palette'

/**
 * Canvas host for the contact visual.
 *
 * Lifecycle only, not drawing — the same contract as the hero's Workstation:
 * size the buffer, stop the loop whenever the work would be wasted, and hand
 * the renderer a fresh palette when the theme changes. Off-screen, hidden tab
 * and reduced motion are all honoured, because any one of them left out means
 * a canvas quietly burning a phone battery.
 *
 * This one has no expensive model to build, so unlike the hero it draws as
 * soon as it is seen rather than waiting for an idle moment.
 */
export function FlightPaths() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const host = canvas.parentElement ?? canvas
    const renderer: FlightRenderer = createFlightRenderer(
      ctx,
      readScenePalette(host),
    )

    let frameId: number | null = null
    let lastTime = 0
    let onScreen = true

    const applySize = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, scene.dprCap)

      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      renderer.resize(rect.width, rect.height, dpr)
      if (reduced) renderer.still()
    }

    const minFrame =
      window.innerWidth < 768
        ? scene.frameInterval.mobile
        : scene.frameInterval.desktop

    // Time skipped by a dropped frame is carried into the next one, so the
    // motion runs at the same speed however often it is drawn.
    let owed = 0

    const tick = (time: number) => {
      const elapsed = lastTime === 0 ? 16 : time - lastTime
      lastTime = time
      owed += elapsed

      if (owed >= minFrame) {
        renderer.frame(owed)
        owed = 0
      }

      frameId = requestAnimationFrame(tick)
    }

    const start = () => {
      if (frameId !== null || reduced) return
      lastTime = 0
      frameId = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (frameId === null) return
      cancelAnimationFrame(frameId)
      frameId = null
    }

    const evaluateRunState = () => {
      if (reduced) return
      if (onScreen && !document.hidden) start()
      else stop()
    }

    applySize()

    const resizeObserver = new ResizeObserver(applySize)
    resizeObserver.observe(host)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false
        if (onScreen && reduced) renderer.still()
        evaluateRunState()
      },
      { threshold: 0 },
    )
    intersectionObserver.observe(host)

    const onVisibilityChange = () => evaluateRunState()

    // Tokens can change under the visitor, so the palette is re-read rather
    // than captured once at mount.
    const themeObserver = new MutationObserver(() => {
      renderer.setPalette(readScenePalette(host))
      if (reduced) renderer.still()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    })

    document.addEventListener('visibilitychange', onVisibilityChange)
    evaluateRunState()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [reduced])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative aspect-stage w-full"
    >
      {/*
        Decorative. The section states where he is and how to reach him in
        text directly beside this, so announcing an unlabelled canvas to a
        screen reader would add noise, not information (R8).
      */}
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
    </div>
  )
}

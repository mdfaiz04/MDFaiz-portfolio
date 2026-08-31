'use client'

import { useEffect, useRef } from 'react'

import { brain } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { createBrainGeometry } from '@/lib/visuals/brain/geometry'
import { readBrainPalette } from '@/lib/visuals/brain/palette'
import {
  createBrainRenderer,
  type BrainRenderer,
} from '@/lib/visuals/brain/render'

/** Fixed so the cloud is identical on every load and every machine. */
const SEED = 20260415

/** Below this width the point budget drops to the mobile figure. */
const MOBILE_BREAKPOINT = 768

/**
 * Canvas host for the neural point cloud.
 *
 * Its job is lifecycle, not drawing: size the buffer, stop the loop whenever
 * the work would be wasted, and hand the renderer a fresh palette when the
 * theme changes. Three independent reasons to stop are all honoured —
 * off-screen, backgrounded tab, and reduced-motion preference — because any
 * one of them left out means a canvas quietly burning a phone battery.
 */
export function NeuralBrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const host = canvas.parentElement ?? canvas

    const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT

    const geometry = createBrainGeometry(
      isSmallScreen ? brain.pointCount.mobile : brain.pointCount.desktop,
      SEED,
      isSmallScreen ? brain.edgeCap.mobile : brain.edgeCap.desktop,
    )

    const renderer: BrainRenderer = createBrainRenderer(
      ctx,
      geometry,
      readBrainPalette(host),
      {
        rotationSpeed: brain.rotationSpeed,
        pulseInterval: brain.pulseInterval,
      },
    )

    let frameId: number | null = null
    let lastTime = 0
    let onScreen = true

    // Arrow functions assigned to const, not hoisted declarations: TypeScript
    // discards the null-narrowing on `canvas` inside a hoisted function,
    // because such a function could in principle run before the guard above.
    const applySize = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, brain.dprCap)

      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      renderer.resize(rect.width, rect.height, dpr)
    }

    const tick = (time: number) => {
      const elapsed = lastTime === 0 ? 16 : time - lastTime
      lastTime = time
      renderer.frame(elapsed)
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

    if (reduced) {
      // Not a slower animation — a single composed frame, drawn once.
      renderer.still()
    }

    const resizeObserver = new ResizeObserver(() => {
      applySize()
      if (reduced) renderer.still()
    })
    resizeObserver.observe(host)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false
        evaluateRunState()
      },
      { threshold: 0 },
    )
    intersectionObserver.observe(host)

    const onVisibilityChange = () => {
      evaluateRunState()
    }

    // Tokens can change under the visitor (a future theme switch), so the
    // palette is re-read rather than captured once at mount.
    const themeObserver = new MutationObserver(() => {
      renderer.setPalette(readBrainPalette(host))
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
      /* Height-capped as well as width-capped: on a short window an
         aspect-square canvas sized only by width is what pushes the hero's
         actions below the fold. */
      className="brain-cap pointer-events-none relative aspect-square w-full max-w-lg xl:max-w-2xl"
    >
      {/*
        Decorative. The hero states the same thing in text directly beside
        it, so announcing an unlabelled canvas to a screen reader would add
        noise, not information (R8).
      */}
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
    </div>
  )
}

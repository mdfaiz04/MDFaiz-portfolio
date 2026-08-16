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

    const pointCount =
      window.innerWidth < MOBILE_BREAKPOINT
        ? brain.pointCount.mobile
        : brain.pointCount.desktop

    const geometry = createBrainGeometry(pointCount, SEED, brain.edgeCap)

    const renderer: BrainRenderer = createBrainRenderer(
      ctx,
      geometry,
      readBrainPalette(host),
      {
        rotationSpeed: brain.rotationSpeed,
        pulseInterval: brain.pulseInterval,
        parallaxDeg: brain.parallaxDeg,
      },
    )

    const pointer = { x: 0, y: 0 }
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
      renderer.frame(elapsed, pointer)
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

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = host.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1
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
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    evaluateRunState()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [reduced])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative aspect-square w-full max-w-xl"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}

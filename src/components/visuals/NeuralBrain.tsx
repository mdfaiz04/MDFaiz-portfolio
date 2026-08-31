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

    /**
     * Built on first sight, and only when the browser has a moment.
     *
     * Carving the model and its edge list is the single most expensive thing
     * this page does. Two things follow from that, and the canvas is
     * decorative, so both are worth having:
     *
     *   - it is not built until the canvas is actually on screen, and
     *   - it is not built while the browser could instead be responding to
     *     the visitor.
     *
     * The cost was measurable: most of the main-thread time before first
     * interaction on a throttled phone. A decoration should never be what
     * makes a button feel slow.
     */
    let renderer: BrainRenderer | null = null
    let idleHandle: number | null = null

    const ensureRenderer = (): BrainRenderer => {
      if (renderer) return renderer

      const geometry = createBrainGeometry(
        isSmallScreen ? brain.pointCount.mobile : brain.pointCount.desktop,
        SEED,
        isSmallScreen ? brain.edgeCap.mobile : brain.edgeCap.desktop,
      )

      renderer = createBrainRenderer(ctx, geometry, readBrainPalette(host), {
        rotationSpeed: brain.rotationSpeed,
        pulseInterval: brain.pulseInterval,
      })

      applySize()
      return renderer
    }

    /**
     * Queue the build for the next idle moment.
     *
     * The timeout is the safety net: if the main thread never goes idle the
     * browser runs it anyway, so a busy page still gets its hero rather than
     * an empty square. Where `requestIdleCallback` is missing — Safari, at
     * time of writing — a timeout of zero at least yields to the current
     * task before starting.
     */
    const buildWhenIdle = () => {
      if (renderer !== null || idleHandle !== null) return

      const run = () => {
        idleHandle = null
        const built = ensureRenderer()
        if (reduced) built.still()
        else evaluateRunState()
      }

      // Checked through a boolean rather than `in window`: the DOM types
      // declare requestIdleCallback as always present, so `in` narrows the
      // else branch to `never` and the fallback stops compiling.
      const supportsIdle = typeof window.requestIdleCallback === 'function'

      idleHandle = supportsIdle
        ? window.requestIdleCallback(run, { timeout: brain.buildTimeout })
        : window.setTimeout(run, 0)
    }

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

      renderer?.resize(rect.width, rect.height, dpr)
    }

    const minFrame = isSmallScreen
      ? brain.frameInterval.mobile
      : brain.frameInterval.desktop

    // Time skipped by a dropped frame is carried into the next one, so the
    // rotation runs at the same speed however often it is drawn.
    let owed = 0

    const tick = (time: number) => {
      if (!renderer) return

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
      // Nothing to run until the model exists; the build schedules its own
      // re-evaluation when it finishes.
      if (reduced || !renderer) return
      if (onScreen && !document.hidden) start()
      else stop()
    }

    applySize()

    const resizeObserver = new ResizeObserver(() => {
      applySize()
      if (reduced && renderer) renderer.still()
    })
    resizeObserver.observe(host)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false

        if (onScreen) buildWhenIdle()
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
      if (!renderer) return
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

      if (idleHandle !== null) {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleHandle)
        } else {
          window.clearTimeout(idleHandle)
        }
      }

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

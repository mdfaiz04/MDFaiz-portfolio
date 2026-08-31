'use client'

import { useEffect, useRef } from 'react'

import { brain } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { readBrainPalette } from '@/lib/visuals/brain/palette'
import {
  createWorkstationRenderer,
  type Glyph,
  type WorkstationRenderer,
} from '@/lib/visuals/workstation/scene'

type WorkstationProps = {
  /** One orbiting tile per glyph. Chosen by the page from the content layer. */
  glyphs: readonly Glyph[]
}

/** Below this width the model budget drops to the mobile figure. */
const MOBILE_BREAKPOINT = 768

/**
 * Canvas host for the hero scene.
 *
 * Its job is lifecycle, not drawing: size the buffer, stop the loop whenever
 * the work would be wasted, and hand the renderer a fresh palette when the
 * theme changes. Three independent reasons to stop are all honoured —
 * off-screen, backgrounded tab, and reduced-motion preference — because any
 * one of them left out means a canvas quietly burning a phone battery.
 *
 * The model is built on first sight AND only when the browser is idle. On a
 * throttled phone the render loop was most of the main-thread time before
 * first interaction; a decoration should never be what makes a button feel
 * slow.
 */
export function Workstation({ glyphs }: WorkstationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  // Joined so the effect re-runs when the set genuinely changes rather than
  // on every render that rebuilds the array identity.
  const glyphKey = glyphs.join(',')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const host = canvas.parentElement ?? canvas
    const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT
    const wanted = glyphKey.split(',').filter(Boolean) as Glyph[]

    let renderer: WorkstationRenderer | null = null
    let idleHandle: number | null = null

    const ensureRenderer = (): WorkstationRenderer => {
      if (renderer) return renderer

      renderer = createWorkstationRenderer(ctx, readBrainPalette(host), {
        rotationSpeed: brain.rotationSpeed,
        nodeCount: isSmallScreen
          ? brain.globeNodes.mobile
          : brain.globeNodes.desktop,
        edgeCap: isSmallScreen ? brain.edgeCap.mobile : brain.edgeCap.desktop,
        glyphs: wanted,
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
    // motion runs at the same speed however often it is drawn.
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
  }, [reduced, glyphKey])

  return (
    <div
      aria-hidden="true"
      /* Height-capped as well as width-capped: on a short window a canvas
         sized only by width is what pushes the hero's actions below the
         fold. */
      className="brain-cap pointer-events-none relative aspect-stage w-full"
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

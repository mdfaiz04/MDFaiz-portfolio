'use client'

import { useEffect, useRef } from 'react'

import { brain } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { createWaveRenderer, type WaveRenderer } from '@/lib/visuals/wave'

/**
 * Canvas host for the contact-section wave.
 *
 * Same lifecycle discipline as the neural hero: it stops when off-screen,
 * stops on a backgrounded tab, and renders a single fixed frame under
 * reduced motion rather than a faster animation.
 */
export function SignalWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const host = canvas.parentElement ?? canvas

    const readColours = () => {
      const styles = getComputedStyle(host)
      return {
        near: styles.getPropertyValue('--color-accent-glow').trim(),
        far: styles.getPropertyValue('--color-accent').trim(),
      }
    }

    const renderer: WaveRenderer = createWaveRenderer(ctx, readColours())

    let frameId: number | null = null
    let lastTime = 0
    let onScreen = false

    const applySize = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, brain.dprCap)

      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      renderer.resize(rect.width, rect.height, dpr)
      if (reduced) renderer.still()
    }

    const tick = (now: number) => {
      const elapsed = lastTime === 0 ? 16 : now - lastTime
      lastTime = now
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
    if (reduced) renderer.still()

    const resizeObserver = new ResizeObserver(applySize)
    resizeObserver.observe(host)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false
        evaluateRunState()
      },
      { threshold: 0 },
    )
    intersectionObserver.observe(host)

    const onVisibilityChange = () => evaluateRunState()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [reduced])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative h-32 w-full sm:h-40"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}

import type { BrainGeometry, Point3 } from './geometry'
import type { BrainPalette } from './palette'

/**
 * The draw loop.
 *
 * Kept out of the React component deliberately: this is imperative canvas
 * work with its own state, and mixing it into a component would mean a
 * re-render per frame. The component owns the element; this owns the pixels.
 */

export type BrainRendererConfig = {
  /** Radians per frame around the vertical axis. */
  rotationSpeed: number
  /** Milliseconds between signal pulses. */
  pulseInterval: number
  /** Maximum cursor parallax, in degrees. */
  parallaxDeg: number
}

export type PointerState = {
  /** −1 … 1, relative to the centre of the canvas. */
  x: number
  y: number
}

export type BrainRenderer = {
  /** Advance and draw. `elapsed` is milliseconds since the previous frame. */
  frame(elapsed: number, pointer: PointerState): void
  /** Draw a single motionless frame — the reduced-motion alternative. */
  still(): void
  resize(width: number, height: number, dpr: number): void
  setPalette(palette: BrainPalette): void
}

type Pulse = { edgeIndex: number; progress: number }

/** Perspective strength. Larger is flatter. */
const FOV = 3.2

/** Fraction of the canvas the cloud occupies. */
const FILL = 0.4

/** How long a pulse takes to travel one synapse, in milliseconds. */
const PULSE_TRAVEL = 900

/** Frame time is clamped so a backgrounded tab cannot jump the animation. */
const MAX_FRAME_MS = 50

const DEG_TO_RAD = Math.PI / 180

/**
 * Glow is drawn from a pre-rendered sprite rather than per-point
 * `shadowBlur`. Blur is recomputed per draw call and is the usual reason a
 * canvas that looks fine on a laptop stutters on a phone.
 */
function createGlowSprite(colour: string, size: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size

  const ctx = sprite.getContext('2d')
  if (!ctx) return sprite

  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, colour)
  gradient.addColorStop(0.35, colour)
  gradient.addColorStop(1, 'transparent')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(half, half, half, 0, Math.PI * 2)
  ctx.fill()

  return sprite
}

export function createBrainRenderer(
  ctx: CanvasRenderingContext2D,
  geometry: BrainGeometry,
  initialPalette: BrainPalette,
  config: BrainRendererConfig,
): BrainRenderer {
  let palette = initialPalette
  let width = 0
  let height = 0
  let rotation = 0
  let sinceLastPulse = 0
  let tiltX = 0
  let tiltY = 0

  let glow = createGlowSprite(palette.point, 64)
  let pulseGlow = createGlowSprite(palette.pulse, 48)

  const pulses: Pulse[] = []
  const projected: { x: number; y: number; depth: number }[] =
    geometry.points.map(() => ({ x: 0, y: 0, depth: 0 }))
  const order: number[] = geometry.points.map((_, index) => index)

  function project(point: Point3, cos: number, sin: number) {
    // Yaw first, then a small pitch from the cursor. Doing it in this order
    // keeps the rotation axis vertical regardless of where the pointer is.
    const x = point.x * cos + point.z * sin
    const z = point.z * cos - point.x * sin
    const y = point.y * Math.cos(tiltX) - z * Math.sin(tiltX)
    const depth = z * Math.cos(tiltX) + point.y * Math.sin(tiltX)

    const scale = FOV / (FOV + depth)
    const radius = Math.min(width, height) * FILL

    return {
      x: width / 2 + x * scale * radius,
      y: height / 2 + y * scale * radius,
      depth,
      scale,
    }
  }

  function drawRing(cos: number) {
    const radius = Math.min(width, height) * FILL
    const centreY = height / 2 + radius * 0.92

    ctx.save()
    ctx.translate(width / 2, centreY)
    ctx.scale(1, 0.24)

    ctx.strokeStyle = palette.ring
    ctx.globalAlpha = 0.22
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.28, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha = 0.1
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.62, 0, Math.PI * 2)
    ctx.stroke()

    // A short bright arc sweeping the ring — the platform reads as powered
    // rather than as a static outline.
    const sweep = Math.atan2(Math.sqrt(1 - cos * cos), cos) * 2
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.28, sweep, sweep + 0.9)
    ctx.stroke()

    ctx.restore()
  }

  function render() {
    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    drawRing(cos)

    let minDepth = Infinity
    let maxDepth = -Infinity

    for (let i = 0; i < geometry.points.length; i += 1) {
      const point = geometry.points[i]
      const target = projected[i]
      if (!point || !target) continue

      const result = project(point, cos, sin)
      target.x = result.x
      target.y = result.y
      target.depth = result.depth

      if (result.depth < minDepth) minDepth = result.depth
      if (result.depth > maxDepth) maxDepth = result.depth
    }

    const span = maxDepth - minDepth || 1
    const nearness = (depth: number) => 1 - (depth - minDepth) / span

    // Synapses sit behind the nodes.
    ctx.lineWidth = 1
    for (const edge of geometry.edges) {
      const a = projected[edge.a]
      const b = projected[edge.b]
      if (!a || !b) continue

      const closeness = (nearness(a.depth) + nearness(b.depth)) / 2
      ctx.globalAlpha = 0.08 + closeness * 0.3
      ctx.strokeStyle = palette.edge
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Painter's algorithm: far points first, so near ones overlap correctly.
    order.sort((left, right) => {
      const a = projected[left]
      const b = projected[right]
      if (!a || !b) return 0
      return b.depth - a.depth
    })

    for (const index of order) {
      const target = projected[index]
      if (!target) continue

      const closeness = nearness(target.depth)
      const size = (3.2 + closeness * 6.5) * 2

      // Floor kept high enough that the far side of the cloud still reads as
      // structure rather than dissolving into the background.
      ctx.globalAlpha = 0.45 + closeness * 0.55
      ctx.drawImage(glow, target.x - size / 2, target.y - size / 2, size, size)
    }

    // Signals travelling the network.
    for (const pulse of pulses) {
      const edge = geometry.edges[pulse.edgeIndex]
      if (!edge) continue

      const a = projected[edge.a]
      const b = projected[edge.b]
      if (!a || !b) continue

      const x = a.x + (b.x - a.x) * pulse.progress
      const y = a.y + (b.y - a.y) * pulse.progress

      // Fade in and out so a pulse never pops into existence.
      const fade = Math.sin(pulse.progress * Math.PI)
      const size = 12

      ctx.globalAlpha = fade
      ctx.drawImage(pulseGlow, x - size / 2, y - size / 2, size, size)
    }

    ctx.globalAlpha = 1
  }

  return {
    frame(elapsed, pointer) {
      const dt = Math.min(elapsed, MAX_FRAME_MS)

      rotation += config.rotationSpeed * (dt / 16.667)

      // Ease towards the pointer rather than tracking it exactly, so the
      // parallax feels like weight instead of a cursor attachment.
      const maxTilt = config.parallaxDeg * DEG_TO_RAD
      tiltX += (pointer.y * maxTilt - tiltX) * 0.05
      tiltY += (pointer.x * maxTilt - tiltY) * 0.05
      rotation += tiltY * 0.0015

      sinceLastPulse += dt
      if (sinceLastPulse >= config.pulseInterval && geometry.edges.length > 0) {
        sinceLastPulse = 0
        pulses.push({
          edgeIndex: Math.floor(Math.random() * geometry.edges.length),
          progress: 0,
        })
      }

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i]
        if (!pulse) continue

        pulse.progress += dt / PULSE_TRAVEL
        if (pulse.progress >= 1) pulses.splice(i, 1)
      }

      render()
    },

    still() {
      // A recognisable three-quarter view, so the static alternative looks
      // composed rather than like a stopped animation.
      rotation = 0.6
      tiltX = 0
      tiltY = 0
      pulses.length = 0
      render()
    },

    resize(nextWidth, nextHeight, dpr) {
      width = nextWidth
      height = nextHeight
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    },

    setPalette(next) {
      palette = next
      glow = createGlowSprite(palette.point, 64)
      pulseGlow = createGlowSprite(palette.pulse, 48)
    },
  }
}

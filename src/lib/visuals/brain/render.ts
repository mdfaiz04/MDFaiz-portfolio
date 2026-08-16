import type { BrainGeometry, BrainPoint } from './geometry'
import {
  mixRgb,
  rgbaString,
  toRgb,
  type BrainPalette,
  type Rgb,
} from './palette'

/**
 * The draw loop.
 *
 * Kept out of the React component deliberately: this is imperative canvas
 * work with its own state, and mixing it into a component would mean a
 * re-render per frame.
 *
 * Everything luminous is composited with `lighter` (additive). That single
 * choice is what separates a neon network from flat dots — overlapping
 * synapses and nodes accumulate into hot spots the way real light does.
 */

export type BrainRendererConfig = {
  rotationSpeed: number
  pulseInterval: number
  orbitYawDeg: number
  orbitPitchDeg: number
  orbitEase: number
}

export type PointerState = { x: number; y: number }

export type BrainRenderer = {
  frame(elapsed: number, pointer: PointerState): void
  still(): void
  resize(width: number, height: number, dpr: number): void
  setPalette(palette: BrainPalette): void
}

type Pulse = { edgeIndex: number; progress: number }

type Projected = {
  x: number
  y: number
  depth: number
  scale: number
}

/** Perspective strength. Larger is flatter. */
const FOV = 3.4

/** Fraction of the canvas the cloud occupies. */
const FILL = 0.46

/** Vertical placement, leaving room for the platform beneath. */
const CENTRE_Y = 0.42

const PULSE_TRAVEL = 900
const MAX_FRAME_MS = 50
const DEG_TO_RAD = Math.PI / 180

/** Pulses run concurrently, so the network never looks idle. */
const MAX_PULSES = 5

/**
 * Rotation that presents the sagittal (side) silhouette. The model is built
 * with z as front-to-back, so a quarter turn puts that axis across the screen.
 */
const SIDE_PROFILE = Math.PI / 2

/** Only the nearer points get an expensive second bloom pass. */
const BLOOM_FRACTION = 0.62

/**
 * Radial sprite. Glow is drawn from a pre-rendered image rather than
 * per-point `shadowBlur`, which is recomputed on every draw call and is the
 * usual reason a canvas that looks fine on a laptop stutters on a phone.
 */
function createSprite(colour: Rgb, size: number, softness: number) {
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size

  const ctx = sprite.getContext('2d')
  if (!ctx) return sprite

  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, rgbaString(colour, 1))
  gradient.addColorStop(softness, rgbaString(colour, 0.35))
  gradient.addColorStop(1, rgbaString(colour, 0))

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  return sprite
}

export function createBrainRenderer(
  ctx: CanvasRenderingContext2D,
  geometry: BrainGeometry,
  initialPalette: BrainPalette,
  config: BrainRendererConfig,
): BrainRenderer {
  let width = 0
  let height = 0
  /** Opens on the silhouette that reads as a brain, then rotates away. */
  let autoRotation = SIDE_PROFILE
  let sinceLastPulse = 0
  let elapsedTotal = 0

  /** Orbit offsets driven by the cursor, eased toward their targets. */
  let yaw = 0
  let pitch = 0

  /** Composed each frame from the automatic turn plus the cursor orbit. */
  let rotation = SIDE_PROFILE
  let tiltX = 0

  let near = toRgb(initialPalette.near)
  let mid = toRgb(initialPalette.mid)
  let far = toRgb(initialPalette.far)
  let edgeRgb = toRgb(initialPalette.edge)
  let baseRgb = toRgb(initialPalette.base)
  let haloRgb = toRgb(initialPalette.halo)

  let coreSprite = createSprite(near, 32, 0.25)
  let bloomSprite = createSprite(mid, 96, 0.12)
  let pulseSprite = createSprite(toRgb(initialPalette.pulse), 64, 0.18)
  let haloSprite = createSprite(haloRgb, 512, 0.02)

  const pulses: Pulse[] = []
  const projected: Projected[] = geometry.points.map(() => ({
    x: 0,
    y: 0,
    depth: 0,
    scale: 1,
  }))
  const order: number[] = geometry.points.map((_, index) => index)

  function project(point: BrainPoint, cos: number, sin: number): Projected {
    const x = point.x * cos + point.z * sin
    const rotatedZ = point.z * cos - point.x * sin

    const cosTilt = Math.cos(tiltX)
    const sinTilt = Math.sin(tiltX)
    const y = point.y * cosTilt - rotatedZ * sinTilt
    const depth = rotatedZ * cosTilt + point.y * sinTilt

    const perspective = FOV / (FOV + depth)
    const radius = Math.min(width, height) * FILL

    return {
      x: width / 2 + x * perspective * radius,
      // Canvas y grows downward while the model treats +y as up, so this
      // subtracts. Adding here renders the whole brain inverted — the
      // brainstem points at the sky and the silhouette stops reading.
      y: height * CENTRE_Y - y * perspective * radius,
      depth,
      scale: perspective,
    }
  }

  /** The lit platform: disc, rings, and a shaft of light rising from it. */
  function drawPlatform(sweep: number) {
    const radius = Math.min(width, height) * FILL
    const centreY = height * CENTRE_Y + radius * 1.02
    const centreX = width / 2

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    // Light rising toward the brain. Drawn as a radial gradient rather than a
    // filled rectangle — a rect gives the glow hard vertical edges and the
    // whole hero reads as a box sitting on the page.
    ctx.save()
    ctx.translate(centreX, centreY)
    ctx.scale(1, 1.5)
    const shaft = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.1)
    shaft.addColorStop(0, rgbaString(baseRgb, 0.32))
    shaft.addColorStop(0.5, rgbaString(baseRgb, 0.08))
    shaft.addColorStop(1, rgbaString(baseRgb, 0))
    ctx.fillStyle = shaft
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.translate(centreX, centreY)
    ctx.scale(1, 0.19)

    // Glowing disc. Kept narrower than the cloud above it — a platform wider
    // than the brain pulls the eye downward, away from the subject.
    const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.05)
    disc.addColorStop(0, rgbaString(baseRgb, 0.6))
    disc.addColorStop(0.45, rgbaString(baseRgb, 0.17))
    disc.addColorStop(1, rgbaString(baseRgb, 0))
    ctx.fillStyle = disc
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2)
    ctx.fill()

    // Concentric rings.
    ctx.lineWidth = 1.5
    for (const [index, factor] of [0.74, 0.92, 1.12].entries()) {
      ctx.strokeStyle = rgbaString(baseRgb, 0.42 - index * 0.11)
      ctx.beginPath()
      ctx.arc(0, 0, radius * factor, 0, Math.PI * 2)
      ctx.stroke()
    }

    // A bright arc sweeping the ring, so the platform reads as powered.
    ctx.lineWidth = 3
    ctx.strokeStyle = rgbaString(baseRgb, 0.85)
    ctx.beginPath()
    ctx.arc(0, 0, radius * 0.92, sweep, sweep + 0.75)
    ctx.stroke()

    ctx.restore()
  }

  function render() {
    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const radius = Math.min(width, height) * FILL

    drawPlatform(rotation * 0.7)

    ctx.globalCompositeOperation = 'lighter'

    // Ambient bloom behind the cloud. Sized to fall to zero well inside the
    // canvas: a halo wider than the element lightens right up to the edge
    // and the hero reads as a rectangle pasted on the page.
    const haloSize = radius * 2.2
    ctx.globalAlpha = 0.45
    ctx.drawImage(
      haloSprite,
      width / 2 - haloSize / 2,
      height * CENTRE_Y - haloSize / 2,
      haloSize,
      haloSize,
    )

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
      target.scale = result.scale

      if (result.depth < minDepth) minDepth = result.depth
      if (result.depth > maxDepth) maxDepth = result.depth
    }

    const span = maxDepth - minDepth || 1
    const nearness = (depth: number) => 1 - (depth - minDepth) / span

    // Synapses first, behind the nodes.
    ctx.lineWidth = 1
    for (const edge of geometry.edges) {
      const a = projected[edge.a]
      const b = projected[edge.b]
      if (!a || !b) continue

      const closeness = (nearness(a.depth) + nearness(b.depth)) / 2
      ctx.strokeStyle = rgbaString(edgeRgb, 0.05 + closeness * 0.28)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Painter's algorithm: far points first.
    order.sort((left, right) => {
      const a = projected[left]
      const b = projected[right]
      if (!a || !b) return 0
      return b.depth - a.depth
    })

    ctx.globalAlpha = 1

    for (const index of order) {
      const target = projected[index]
      const point = geometry.points[index]
      if (!target || !point) continue

      const closeness = nearness(target.depth)
      const isCortex = point.kind === 'cortex'

      // Bloom pass on the near half only — the far side gains nothing
      // visible from it and it doubles the draw cost.
      if (isCortex && closeness > 1 - BLOOM_FRACTION) {
        const bloomSize = (22 + closeness * 34) * target.scale
        ctx.globalAlpha = (closeness - (1 - BLOOM_FRACTION)) * 0.62
        ctx.drawImage(
          bloomSprite,
          target.x - bloomSize / 2,
          target.y - bloomSize / 2,
          bloomSize,
          bloomSize,
        )
      }

      // Depth-graded core: far → mid over the back half, mid → near over
      // the front half, so the cloud reads as a solid lit object.
      const tint =
        closeness < 0.5
          ? mixRgb(far, mid, closeness * 2)
          : mixRgb(mid, near, (closeness - 0.5) * 2)

      // The stem stays bright enough to visibly join the brain to the
      // platform; interior points sit back so they read as depth, not noise.
      const weight = isCortex ? 1 : point.kind === 'stem' ? 0.9 : 0.4
      const size = (2.2 + closeness * 5.2) * target.scale * weight

      ctx.globalAlpha = (0.35 + closeness * 0.65) * weight
      ctx.fillStyle = rgbaString(tint, 1)
      ctx.beginPath()
      ctx.arc(target.x, target.y, Math.max(0.4, size * 0.28), 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = (0.2 + closeness * 0.5) * weight
      ctx.drawImage(
        coreSprite,
        target.x - size / 2,
        target.y - size / 2,
        size,
        size,
      )
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
      const fade = Math.sin(pulse.progress * Math.PI)
      const size = 16 * a.scale

      ctx.globalAlpha = fade
      ctx.drawImage(pulseSprite, x - size / 2, y - size / 2, size, size)
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  return {
    frame(elapsed, pointer) {
      const dt = Math.min(elapsed, MAX_FRAME_MS)
      elapsedTotal += dt

      autoRotation += config.rotationSpeed * (dt / 16.667)

      // The cursor orbits the brain: yaw turns it left and right, pitch tips
      // it toward and away. Both ease toward their target rather than
      // snapping, so the object feels like it has mass — and both are
      // offsets *added* to the automatic turn, so it keeps rotating on its
      // own while still answering to the pointer.
      const targetYaw = pointer.x * config.orbitYawDeg * DEG_TO_RAD
      const targetPitch = pointer.y * config.orbitPitchDeg * DEG_TO_RAD

      yaw += (targetYaw - yaw) * config.orbitEase
      pitch += (targetPitch - pitch) * config.orbitEase

      rotation = autoRotation + yaw
      tiltX = pitch

      sinceLastPulse += dt
      if (
        sinceLastPulse >= config.pulseInterval &&
        geometry.edges.length > 0 &&
        pulses.length < MAX_PULSES
      ) {
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
      // Near side-profile. The sagittal silhouette is the view that reads as
      // a brain in under a second; a three-quarter angle merges the lobes
      // into an anonymous blob.
      autoRotation = SIDE_PROFILE
      yaw = 0
      pitch = -0.06
      rotation = SIDE_PROFILE
      tiltX = -0.06
      elapsedTotal = 0
      pulses.length = 0
      render()
    },

    resize(nextWidth, nextHeight, dpr) {
      width = nextWidth
      height = nextHeight
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    },

    setPalette(next) {
      near = toRgb(next.near)
      mid = toRgb(next.mid)
      far = toRgb(next.far)
      edgeRgb = toRgb(next.edge)
      baseRgb = toRgb(next.base)
      haloRgb = toRgb(next.halo)

      coreSprite = createSprite(near, 32, 0.25)
      bloomSprite = createSprite(mid, 96, 0.12)
      pulseSprite = createSprite(toRgb(next.pulse), 64, 0.18)
      haloSprite = createSprite(haloRgb, 512, 0.02)
    },
  }
}

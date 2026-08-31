import {
  mixRgb,
  rgbaString,
  toRgb,
  type BrainPalette,
  type Rgb,
} from '../brain/palette'

/**
 * The hero object: a workstation, built and drawn in perspective.
 *
 * A laptop on a lit grid, a wireframe globe turning above it, and the
 * portfolio's own capability areas orbiting the pair as billboards. Kept out
 * of the React component deliberately — this is imperative canvas work with
 * its own state, and mixing it into a component would mean a re-render per
 * frame.
 *
 * Everything luminous composites with `lighter` (additive). That single
 * choice is what separates a neon scene from flat shapes: overlapping edges
 * and glows accumulate into hot spots the way real light does.
 *
 * Colours are read from the design tokens by the caller, so retuning the
 * palette in globals.css retunes this with everything else (R2).
 */

export type Glyph =
  'code' | 'database' | 'cloud' | 'chart' | 'chat' | 'terminal'

export type WorkstationConfig = {
  /** Radians per millisecond of globe spin. */
  rotationSpeed: number
  /** Points on the globe. The main cost per frame. */
  nodeCount: number
  /** Hard cap on drawn connections. */
  edgeCap: number
  /** One billboard per glyph, evenly spaced around the orbit. */
  glyphs: readonly Glyph[]
}

export type WorkstationRenderer = {
  frame(elapsed: number): void
  still(): void
  resize(width: number, height: number, dpr: number): void
  setPalette(palette: BrainPalette): void
}

type Vec3 = { x: number; y: number; z: number }
type Projected = { x: number; y: number; depth: number; scale: number }

/** Perspective strength. Larger is flatter. */
const FOV = 4.1

/** Fraction of the shorter canvas edge one model unit maps to. */
const FILL = 0.235

/** Vertical placement of the model origin. */
const CENTRE_Y = 0.73

/**
 * Camera pitch, in radians. The single most important number here.
 *
 * Without it the camera sits level with the deck, and a horizontal plane seen
 * edge-on projects to a sliver — the laptop reads as a flat rectangle and the
 * floor grid disappears entirely. Looking down about twenty degrees opens
 * both into parallelograms, which is what makes the scene read as an object
 * in space rather than as artwork.
 */
const PITCH = 0.33

/** A frame longer than this is a tab waking up, not a slow device. */
const MAX_FRAME_MS = 50

/** The laptop sways rather than spins: a full turn would face it away. */
const SWAY_RADIANS = 0.13
const SWAY_SPEED = 0.00021

/** Deck height, and the lid's lean back from vertical. */
const DECK_Y = -0.55
const LID_TILT = 0.2
const LID_HEIGHT = 1.3

const GLOBE_CENTRE: Vec3 = { x: 0, y: 1.5, z: -0.15 }
const GLOBE_RADIUS = 0.78
const ORBIT_RADIUS = 1.55
/**
 * How far the orbit ring tips out of horizontal.
 *
 * Steeper looks more dynamic and clips: the near tile is both the highest and
 * the largest, so it is the one that runs off the top of the frame. This is
 * the angle at which it clears.
 */
const ORBIT_TILT = 0.26
const ORBIT_SPEED = 0.00034

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/**
 * The lid and deck as four corners each, in the order
 * back-left, back-right, front-right, front-left.
 *
 * Defining both as quads rather than as a mesh means anything drawn on them —
 * code lines, key rows — can be positioned in flat 0..1 surface coordinates
 * and mapped onto the quad, which is far easier to reason about than
 * placing every segment in three dimensions by hand.
 */
const DECK: Vec3[] = [
  { x: -1.02, y: DECK_Y, z: -0.58 },
  { x: 1.02, y: DECK_Y, z: -0.58 },
  { x: 1.24, y: DECK_Y, z: 0.72 },
  { x: -1.24, y: DECK_Y, z: 0.72 },
]

const LID: Vec3[] = [
  {
    x: -1.02,
    y: DECK_Y + LID_HEIGHT * Math.cos(LID_TILT),
    z: -0.58 - LID_HEIGHT * Math.sin(LID_TILT),
  },
  {
    x: 1.02,
    y: DECK_Y + LID_HEIGHT * Math.cos(LID_TILT),
    z: -0.58 - LID_HEIGHT * Math.sin(LID_TILT),
  },
  { x: 1.02, y: DECK_Y, z: -0.58 },
  { x: -1.02, y: DECK_Y, z: -0.58 },
]

/** Bilinear point on a quad. `u` runs left to right, `v` back to front. */
function onQuad(quad: Vec3[], u: number, v: number): Vec3 {
  const [a, b, c, d] = quad
  if (!a || !b || !c || !d) return { x: 0, y: 0, z: 0 }

  const topX = a.x + (b.x - a.x) * u
  const topY = a.y + (b.y - a.y) * u
  const topZ = a.z + (b.z - a.z) * u

  const bottomX = d.x + (c.x - d.x) * u
  const bottomY = d.y + (c.y - d.y) * u
  const bottomZ = d.z + (c.z - d.z) * u

  return {
    x: topX + (bottomX - topX) * v,
    y: topY + (bottomY - topY) * v,
    z: topZ + (bottomZ - topZ) * v,
  }
}

/**
 * Deterministic pseudo-random. The scene must be identical on every load —
 * a hero that reshuffles itself on refresh reads as a glitch.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Points spread evenly over a sphere, plus their short connections. */
function buildGlobe(count: number, edgeCap: number) {
  const points: Vec3[] = []

  for (let i = 0; i < count; i += 1) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * GOLDEN_ANGLE

    points.push({
      x: Math.cos(theta) * ring * GLOBE_RADIUS,
      y: y * GLOBE_RADIUS,
      z: Math.sin(theta) * ring * GLOBE_RADIUS,
    })
  }

  /**
   * Nearest-neighbour wiring, by distance rather than by a fixed count: on a
   * sphere every point has roughly the same spacing, so one radius gives
   * every point roughly the same number of connections.
   *
   * The constant is not arbitrary. For `count` points spread evenly over a
   * sphere of radius R, neighbours sit about `R * sqrt(14.5 / count)` apart,
   * so a threshold of `4.6 * R / sqrt(count)` is a little over one spacing —
   * enough to reach the immediate ring and nothing beyond it. Set below the
   * spacing, as it first was, and nothing connects at all: the sphere renders
   * as loose dust.
   */
  const threshold = (GLOBE_RADIUS * 4.6) / Math.sqrt(count)
  const edges: [number, number][] = []

  for (let i = 0; i < points.length && edges.length < edgeCap; i += 1) {
    for (let j = i + 1; j < points.length && edges.length < edgeCap; j += 1) {
      const a = points[i]
      const b = points[j]
      if (!a || !b) continue

      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z

      if (dx * dx + dy * dy + dz * dz < threshold * threshold) {
        edges.push([i, j])
      }
    }
  }

  return { points, edges }
}

/** Code lines for the screen, in surface coordinates. Seeded, so stable. */
function buildCodeLines(seed: number) {
  const random = mulberry32(seed)
  const lines: { v: number; start: number; end: number; tone: number }[] = []
  const rows = 11

  for (let row = 0; row < rows; row += 1) {
    const v = 0.14 + (row / rows) * 0.74
    const indent = 0.1 + Math.floor(random() * 3) * 0.07
    const width = 0.16 + random() * 0.46

    lines.push({
      v,
      start: indent,
      end: Math.min(0.88, indent + width),
      tone: random(),
    })
  }

  return lines
}

// ---------------------------------------------------------------------------
// Glyphs
// ---------------------------------------------------------------------------

/**
 * Billboard glyphs, drawn in flat screen space at a given centre and size.
 *
 * Deliberately reduced to a few strokes each: at the size these render, more
 * detail turns to mud, and the recognisable part of every one of these marks
 * is its silhouette.
 */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: Glyph,
  cx: number,
  cy: number,
  size: number,
): void {
  const unit = size / 2
  ctx.beginPath()

  if (glyph === 'code') {
    ctx.moveTo(cx - unit * 0.15, cy - unit * 0.62)
    ctx.lineTo(cx - unit * 0.72, cy)
    ctx.lineTo(cx - unit * 0.15, cy + unit * 0.62)
    ctx.moveTo(cx + unit * 0.15, cy - unit * 0.62)
    ctx.lineTo(cx + unit * 0.72, cy)
    ctx.lineTo(cx + unit * 0.15, cy + unit * 0.62)
    return void ctx.stroke()
  }

  if (glyph === 'database') {
    const rx = unit * 0.62
    const ry = unit * 0.24
    for (let level = -1; level <= 1; level += 1) {
      ctx.moveTo(cx + rx, cy + level * ry * 1.5)
      ctx.ellipse(cx, cy + level * ry * 1.5, rx, ry, 0, 0, Math.PI * 2)
    }
    ctx.moveTo(cx - rx, cy - ry * 1.5)
    ctx.lineTo(cx - rx, cy + ry * 1.5)
    ctx.moveTo(cx + rx, cy - ry * 1.5)
    ctx.lineTo(cx + rx, cy + ry * 1.5)
    return void ctx.stroke()
  }

  if (glyph === 'cloud') {
    ctx.arc(
      cx - unit * 0.3,
      cy + unit * 0.08,
      unit * 0.3,
      Math.PI * 0.5,
      Math.PI * 1.5,
    )
    ctx.arc(cx, cy - unit * 0.16, unit * 0.38, Math.PI, Math.PI * 2)
    ctx.arc(
      cx + unit * 0.34,
      cy + unit * 0.08,
      unit * 0.28,
      Math.PI * 1.5,
      Math.PI * 0.5,
    )
    ctx.closePath()
    return void ctx.stroke()
  }

  if (glyph === 'chart') {
    const bars = [0.34, 0.62, 0.46, 0.78]
    const step = (unit * 1.3) / bars.length
    bars.forEach((height, index) => {
      const x = cx - unit * 0.6 + index * step
      ctx.moveTo(x, cy + unit * 0.55)
      ctx.lineTo(x, cy + unit * 0.55 - unit * height * 1.4)
    })
    return void ctx.stroke()
  }

  if (glyph === 'chat') {
    ctx.moveTo(cx - unit * 0.62, cy - unit * 0.18)
    ctx.lineTo(cx - unit * 0.62, cy + unit * 0.18)
    ctx.lineTo(cx - unit * 0.18, cy + unit * 0.18)
    ctx.lineTo(cx - unit * 0.34, cy + unit * 0.6)
    ctx.lineTo(cx + unit * 0.2, cy + unit * 0.18)
    ctx.lineTo(cx + unit * 0.62, cy + unit * 0.18)
    ctx.lineTo(cx + unit * 0.62, cy - unit * 0.5)
    ctx.lineTo(cx - unit * 0.62, cy - unit * 0.5)
    ctx.closePath()
    return void ctx.stroke()
  }

  // terminal
  ctx.rect(cx - unit * 0.66, cy - unit * 0.5, unit * 1.32, unit * 1)
  ctx.moveTo(cx - unit * 0.36, cy - unit * 0.16)
  ctx.lineTo(cx - unit * 0.12, cy + unit * 0.04)
  ctx.lineTo(cx - unit * 0.36, cy + unit * 0.24)
  ctx.moveTo(cx + unit * 0.04, cy + unit * 0.24)
  ctx.lineTo(cx + unit * 0.38, cy + unit * 0.24)
  ctx.stroke()
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export function createWorkstationRenderer(
  ctx: CanvasRenderingContext2D,
  initialPalette: BrainPalette,
  config: WorkstationConfig,
): WorkstationRenderer {
  const globe = buildGlobe(config.nodeCount, config.edgeCap)
  const code = buildCodeLines(0x5eed)

  let palette = initialPalette
  let tones = readTones(palette)
  let width = 0
  let height = 0
  let radius = 0
  let time = 0

  function readTones(source: BrainPalette): Record<string, Rgb> {
    return {
      near: toRgb(source.near),
      mid: toRgb(source.mid),
      far: toRgb(source.far),
      edge: toRgb(source.edge),
      pulse: toRgb(source.pulse),
      halo: toRgb(source.halo),
      base: toRgb(source.base),
    }
  }

  /**
   * Turn the model about Y, tip the camera down, then project.
   *
   * `spin` turns the model; `PITCH` belongs to the camera and never changes.
   * Yaw first and pitch second is what keeps the horizon level as the scene
   * turns — the other order rolls it.
   */
  function project(point: Vec3, spin: number): Projected {
    const cosY = Math.cos(spin)
    const sinY = Math.sin(spin)

    const x = point.x * cosY - point.z * sinY
    const yawed = point.x * sinY + point.z * cosY

    const cosP = Math.cos(PITCH)
    const sinP = Math.sin(PITCH)

    const y = point.y * cosP - yawed * sinP
    const z = point.y * sinP + yawed * cosP

    const scale = FOV / (FOV - z)

    return {
      x: width / 2 + x * scale * radius,
      y: height * CENTRE_Y - y * scale * radius,
      depth: z,
      scale,
    }
  }

  function strokeQuad(quad: Vec3[], spin: number, colour: Rgb, alpha: number) {
    const projected = quad.map((corner) => project(corner, spin))
    const first = projected[0]
    if (!first) return

    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (const corner of projected.slice(1)) ctx.lineTo(corner.x, corner.y)
    ctx.closePath()
    ctx.strokeStyle = rgbaString(colour, alpha)
    ctx.stroke()
  }

  function fillQuad(quad: Vec3[], spin: number, colour: Rgb, alpha: number) {
    const projected = quad.map((corner) => project(corner, spin))
    const first = projected[0]
    if (!first) return

    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (const corner of projected.slice(1)) ctx.lineTo(corner.x, corner.y)
    ctx.closePath()
    ctx.fillStyle = rgbaString(colour, alpha)
    ctx.fill()
  }

  /** The lit floor: a grid that fades out rather than ending in a hard edge. */
  function drawGrid(spin: number) {
    const y = DECK_Y - 0.34
    const span = 2.5
    const step = 0.36

    ctx.lineWidth = Math.max(0.6, radius * 0.006)

    for (let i = -span; i <= span + 0.001; i += step) {
      const fade = 1 - Math.abs(i) / (span + step)

      for (const line of [
        [
          { x: i, y, z: -span },
          { x: i, y, z: span },
        ],
        [
          { x: -span, y, z: i },
          { x: span, y, z: i },
        ],
      ]) {
        const a = project(line[0] as Vec3, spin)
        const b = project(line[1] as Vec3, spin)

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = rgbaString(tones.far ?? tones.mid!, 0.22 * fade)
        ctx.stroke()
      }
    }
  }

  function drawLaptop(spin: number) {
    const base = tones.base!
    const near = tones.near!
    const mid = tones.mid!
    const halo = tones.halo!

    // Deck: a dark face so the grid does not read through the machine.
    fillQuad(DECK, spin, tones.far!, 0.34)

    ctx.lineWidth = Math.max(1, radius * 0.012)
    strokeQuad(DECK, spin, base, 0.85)

    // Key rows, as short strokes in deck surface coordinates.
    ctx.lineWidth = Math.max(0.8, radius * 0.007)
    for (let row = 0; row < 4; row += 1) {
      const v = 0.2 + row * 0.15
      for (let key = 0; key < 12; key += 1) {
        const u = 0.1 + key * 0.0655
        const a = project(onQuad(DECK, u, v), spin)
        const b = project(onQuad(DECK, u + 0.045, v), spin)

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = rgbaString(base, 0.42)
        ctx.stroke()
      }
    }

    // Trackpad.
    strokeQuad(
      [
        onQuad(DECK, 0.38, 0.76),
        onQuad(DECK, 0.62, 0.76),
        onQuad(DECK, 0.62, 0.93),
        onQuad(DECK, 0.38, 0.93),
      ],
      spin,
      base,
      0.4,
    )

    // Lid: dark panel, bright bezel, then the code.
    fillQuad(LID, spin, tones.far!, 0.4)
    ctx.lineWidth = Math.max(1.2, radius * 0.014)
    strokeQuad(LID, spin, near, 0.9)

    const screenGlow = project(onQuad(LID, 0.5, 0.5), spin)
    const bloom = ctx.createRadialGradient(
      screenGlow.x,
      screenGlow.y,
      0,
      screenGlow.x,
      screenGlow.y,
      radius * 1.5,
    )
    bloom.addColorStop(0, rgbaString(mid, 0.3))
    bloom.addColorStop(1, rgbaString(mid, 0))
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = Math.max(1, radius * 0.011)
    for (const line of code) {
      const a = project(onQuad(LID, line.start, line.v), spin)
      const b = project(onQuad(LID, line.end, line.v), spin)
      const colour =
        line.tone > 0.72 ? halo : line.tone > 0.4 ? mid : tones.edge!

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = rgbaString(colour, 0.95)
      ctx.stroke()
    }
  }

  function drawGlobe(spin: number) {
    const edge = tones.edge!
    const near = tones.near!
    const mid = tones.mid!
    const far = tones.far!

    const projected = globe.points.map((point) =>
      project(
        {
          x: point.x + GLOBE_CENTRE.x,
          y: point.y + GLOBE_CENTRE.y,
          z: point.z + GLOBE_CENTRE.z,
        },
        spin,
      ),
    )

    ctx.lineWidth = Math.max(0.8, radius * 0.0065)
    for (const [from, to] of globe.edges) {
      const a = projected[from]
      const b = projected[to]
      if (!a || !b) continue

      const depth = (a.depth + b.depth) / 2
      const front = (depth + GLOBE_RADIUS) / (GLOBE_RADIUS * 2)

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = rgbaString(edge, 0.1 + front * 0.44)
      ctx.stroke()
    }

    for (const point of projected) {
      const front = (point.depth + GLOBE_RADIUS) / (GLOBE_RADIUS * 2)
      const colour = mixRgb(far, front > 0.5 ? near : mid, front)
      const size = Math.max(1, radius * 0.02 * point.scale * (0.45 + front))

      ctx.beginPath()
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
      ctx.fillStyle = rgbaString(colour, 0.35 + front * 0.6)
      ctx.fill()
    }
  }

  /**
   * Capability tiles, orbiting the globe as billboards.
   *
   * Drawn in two passes around the globe rather than one after it. Painting
   * every tile last put the far side of the orbit in front of the sphere,
   * which reads as tiles stuck to the glass instead of circling it.
   */
  function drawOrbiters(spin: number, revolve: number, side: 'back' | 'front') {
    const near = tones.near!
    const edge = tones.edge!
    const count = config.glyphs.length
    if (count === 0) return

    const globeDepth = project(GLOBE_CENTRE, spin).depth

    const placed = config.glyphs
      .map((glyph, index) => {
        const angle = revolve + (index / count) * Math.PI * 2
        const point: Vec3 = {
          x: GLOBE_CENTRE.x + Math.cos(angle) * ORBIT_RADIUS,
          y:
            GLOBE_CENTRE.y +
            Math.sin(angle) * ORBIT_RADIUS * Math.sin(ORBIT_TILT),
          z:
            GLOBE_CENTRE.z +
            Math.sin(angle) * ORBIT_RADIUS * Math.cos(ORBIT_TILT),
        }

        return { glyph, projected: project(point, spin) }
      })
      .filter(({ projected }) =>
        side === 'back'
          ? projected.depth < globeDepth
          : projected.depth >= globeDepth,
      )

    // Painter's algorithm: the far side of the orbit is drawn first, so tiles
    // genuinely pass behind the globe rather than always sitting on top.
    placed.sort((a, b) => a.projected.depth - b.projected.depth)

    for (const { glyph, projected } of placed) {
      const front = (projected.depth + ORBIT_RADIUS) / (ORBIT_RADIUS * 2)
      const alpha = 0.3 + front * 0.65
      const size = radius * 0.33 * projected.scale
      const half = size / 2

      ctx.lineWidth = Math.max(1, radius * 0.009)

      ctx.beginPath()
      ctx.roundRect(
        projected.x - half,
        projected.y - half,
        size,
        size,
        size * 0.26,
      )
      ctx.fillStyle = rgbaString(tones.far!, 0.5 * alpha)
      ctx.fill()
      ctx.strokeStyle = rgbaString(edge, 0.55 * alpha)
      ctx.stroke()

      ctx.lineWidth = Math.max(1, radius * 0.011)
      ctx.strokeStyle = rgbaString(near, 0.85 * alpha)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      drawGlyph(ctx, glyph, projected.x, projected.y, size * 0.58)
    }
  }

  /** Ambient bloom, kept inside the canvas so it never reads as a rectangle. */
  function drawAtmosphere() {
    const cx = width / 2
    const cy = height * CENTRE_Y
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.4)

    gradient.addColorStop(0, rgbaString(tones.halo!, 0.2))
    gradient.addColorStop(0.55, rgbaString(tones.halo!, 0.06))
    gradient.addColorStop(1, rgbaString(tones.halo!, 0))

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  function draw() {
    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // The laptop sways within a narrow arc; a full rotation would spend half
    // its time showing the back of a lid.
    const sway = Math.sin(time * SWAY_SPEED) * SWAY_RADIANS
    const revolve = time * ORBIT_SPEED

    drawAtmosphere()
    drawGrid(sway)
    drawOrbiters(sway, revolve, 'back')
    drawLaptop(sway)
    drawGlobe(sway + time * config.rotationSpeed)
    drawOrbiters(sway, revolve, 'front')

    ctx.globalCompositeOperation = 'source-over'
  }

  return {
    frame(elapsed) {
      time += Math.min(elapsed, MAX_FRAME_MS)
      draw()
    },
    still() {
      draw()
    },
    resize(nextWidth, nextHeight, dpr) {
      width = nextWidth
      height = nextHeight
      radius = Math.min(width, height) * FILL
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    },
    setPalette(next) {
      palette = next
      tones = readTones(palette)
    },
  }
}

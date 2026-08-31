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
const FILL = 0.25

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

/**
 * The machine is turned to three-quarters and breathes within a narrow arc.
 *
 * Head-on, a laptop is a rectangle above a rectangle and the eye has nothing
 * to read depth from. Turned, both the side of the base and the angle of the
 * lid become visible at once — which is why every product photograph of a
 * laptop ever taken is shot from roughly here. A full rotation would spend
 * half its time showing the back of a lid, so it sways instead.
 */
const BASE_YAW = 0.34
const SWAY_RADIANS = 0.055
const SWAY_SPEED = 0.00019

/** Deck height, and the lid's lean back from vertical. */
const DECK_Y = -0.55
/** The base is a slab, not a plane — the front lip is what sells it. */
const DECK_THICKNESS = 0.075
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
const ORBIT_TILT = 0.22
const ORBIT_SPEED = 0.00034

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * Shadow and the darkest part of a screen. Not a design token on purpose:
 * this is the absence of light rather than a colour choice, and it stays
 * correct whatever the palette is retuned to.
 */
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

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

/**
 * A screenful of code, in editor coordinates. Seeded, so it is stable.
 *
 * Each row is a few coloured runs rather than one bar, because that is what
 * distinguishes code from a paragraph at a glance: short keyword, longer
 * name, a string. Indentation follows a running depth the way real code
 * does — it opens a block, stays there, and closes — instead of jittering
 * line to line, which is the tell of a drawing of code.
 */
type CodeRun = { start: number; end: number; tone: number }

function buildCodeLines(seed: number) {
  const random = mulberry32(seed)
  const rows: { v: number; runs: CodeRun[] }[] = []
  const count = 14
  let depth = 0

  for (let row = 0; row < count; row += 1) {
    const v = 0.1 + (row / count) * 0.82

    if (random() > 0.72 && depth < 3) depth += 1
    else if (random() > 0.86 && depth > 0) depth -= 1

    // A blank line every so often, as in anything anyone actually wrote.
    if (random() > 0.88) {
      rows.push({ v, runs: [] })
      continue
    }

    const runs: CodeRun[] = []
    let cursor = 0.06 + depth * 0.055
    const segments = 1 + Math.floor(random() * 3)

    for (let segment = 0; segment < segments; segment += 1) {
      const width = 0.06 + random() * 0.17
      if (cursor + width > 0.94) break

      runs.push({ start: cursor, end: cursor + width, tone: random() })
      cursor += width + 0.022
    }

    rows.push({ v, runs })
  }

  return rows
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

  /**
   * Every palette entry, parsed once per theme change rather than per frame.
   *
   * Typed as the palette's own keys, not `Record<string, Rgb>`. The loose
   * version let a missing entry through as `undefined`, which then reached
   * `mixRgb` and threw inside the draw loop — killing the animation while
   * leaving a canvas that had already been cleared. A blank hero and no
   * error in sight.
   */
  function readTones(source: BrainPalette): Record<keyof BrainPalette, Rgb> {
    return {
      near: toRgb(source.near),
      mid: toRgb(source.mid),
      far: toRgb(source.far),
      edge: toRgb(source.edge),
      pulse: toRgb(source.pulse),
      halo: toRgb(source.halo),
      base: toRgb(source.base),
      shell: toRgb(source.shell),
      shellDeep: toRgb(source.shellDeep),
      rule: toRgb(source.rule),
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

  /**
   * A quad as a path, returning its projected corners for anything that needs
   * to place a gradient along the same surface.
   */
  function quadPath(quad: Vec3[], spin: number): Projected[] {
    const corners = quad.map((corner) => project(corner, spin))
    const first = corners[0]
    if (!first) return corners

    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y)
    ctx.closePath()

    return corners
  }

  /** A linear gradient running between two points on a surface. */
  function surfaceGradient(
    quad: Vec3[],
    spin: number,
    from: [number, number],
    to: [number, number],
    stops: [number, string][],
  ): CanvasGradient {
    const a = project(onQuad(quad, from[0], from[1]), spin)
    const b = project(onQuad(quad, to[0], to[1]), spin)
    const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    for (const [offset, colour] of stops) gradient.addColorStop(offset, colour)
    return gradient
  }

  /** Inset a quad in surface coordinates — the bezel, the screen, the keys. */
  function inset(
    quad: Vec3[],
    u0: number,
    v0: number,
    u1: number,
    v1: number,
  ): Vec3[] {
    return [
      onQuad(quad, u0, v0),
      onQuad(quad, u1, v0),
      onQuad(quad, u1, v1),
      onQuad(quad, u0, v1),
    ]
  }

  /**
   * The machine, as a solid object.
   *
   * Drawn with `source-over` and opaque fills, unlike everything else in this
   * scene. That is the whole difference between a product render and a neon
   * diagram: additive compositing makes every surface glow and nothing ever
   * occludes anything, so the result reads as line art however much detail is
   * added to it. Light is added back afterwards, on top, in `drawLaptopLight`.
   */
  function drawLaptopBody(spin: number) {
    const shell = tones.shell!
    const deep = tones.shellDeep!
    const rule = tones.rule!
    const near = tones.near!

    // Contact shadow. Without something dark beneath it the machine floats.
    const under = project(onQuad(DECK, 0.5, 0.55), spin)
    const spread = radius * 1.5
    const shadow = ctx.createRadialGradient(
      under.x,
      under.y,
      0,
      under.x,
      under.y,
      spread,
    )
    shadow.addColorStop(0, rgbaString(BLACK, 0.55))
    shadow.addColorStop(1, rgbaString(BLACK, 0))
    ctx.fillStyle = shadow
    ctx.beginPath()
    ctx.ellipse(
      under.x,
      under.y + radius * 0.1,
      spread,
      spread * 0.3,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    // --- the base, with real thickness ------------------------------------
    const skirt = DECK.map((corner) => ({
      ...corner,
      y: corner.y - DECK_THICKNESS,
    }))

    const faces: [Vec3[], number][] = [
      // front, then the two sides. Only one side faces the camera at a time,
      // but the sway crosses centre, so both are drawn.
      [[DECK[3]!, DECK[2]!, skirt[2]!, skirt[3]!], 0.55],
      [[DECK[0]!, DECK[3]!, skirt[3]!, skirt[0]!], 0.34],
      [[DECK[1]!, DECK[2]!, skirt[2]!, skirt[1]!], 0.34],
    ]

    for (const [face, shade] of faces) {
      quadPath(face, spin)
      ctx.fillStyle = rgbaString(mixRgb(deep, shell, shade), 1)
      ctx.fill()
    }

    // Deck top: lit from the hinge, falling away toward the front edge.
    quadPath(DECK, spin)
    ctx.fillStyle = surfaceGradient(
      DECK,
      spin,
      [0.5, 0],
      [0.5, 1],
      [
        [0, rgbaString(mixRgb(deep, shell, 1.35), 1)],
        [1, rgbaString(mixRgb(deep, shell, 0.55), 1)],
      ],
    )
    ctx.fill()

    // The machined edge where the top face meets the front lip.
    ctx.lineWidth = Math.max(0.8, radius * 0.006)
    ctx.strokeStyle = rgbaString(near, 0.22)
    ctx.stroke()

    // A brighter specular along the front lip alone, where a real chamfer
    // would catch the light square on.
    const lipLeft = project(onQuad(DECK, 0, 1), spin)
    const lipRight = project(onQuad(DECK, 1, 1), spin)
    ctx.lineWidth = Math.max(1, radius * 0.009)
    ctx.beginPath()
    ctx.moveTo(lipLeft.x, lipLeft.y)
    ctx.lineTo(lipRight.x, lipRight.y)
    ctx.strokeStyle = rgbaString(near, 0.3)
    ctx.stroke()

    // --- the lid ----------------------------------------------------------
    // Drawn after the base but sharing its back edge, so the base's own edge
    // highlight stays on top where the two meet.
    quadPath(LID, spin)
    ctx.fillStyle = surfaceGradient(
      LID,
      spin,
      [0, 0],
      [1, 1],
      [
        [0, rgbaString(mixRgb(deep, shell, 1), 1)],
        [1, rgbaString(mixRgb(deep, shell, 0.35), 1)],
      ],
    )
    ctx.fill()
    ctx.strokeStyle = rgbaString(rule, 0.9)
    ctx.stroke()

    // Rim light along the top of the lid.
    const rimLeft = project(onQuad(LID, 0, 0), spin)
    const rimRight = project(onQuad(LID, 1, 0), spin)
    ctx.lineWidth = Math.max(1, radius * 0.008)
    ctx.beginPath()
    ctx.moveTo(rimLeft.x, rimLeft.y)
    ctx.lineTo(rimRight.x, rimRight.y)
    ctx.strokeStyle = rgbaString(near, 0.26)
    ctx.stroke()

    // Bezel, then the panel itself. A chin below the screen, as on a real
    // machine — a perfectly centred screen is one of the tells of a drawing.
    const panel = inset(LID, 0.045, 0.055, 0.955, 0.88)
    quadPath(panel, spin)
    ctx.fillStyle = surfaceGradient(
      LID,
      spin,
      [0.5, 0],
      [0.5, 1],
      [
        [0, rgbaString(mixRgb(deep, BLACK, 0.5), 1)],
        [1, rgbaString(mixRgb(deep, BLACK, 0.78), 1)],
      ],
    )
    ctx.fill()

    return panel
  }

  /**
   * Everything the machine emits or catches: the screen, its spill onto the
   * deck, the specular sweep across the lid, and the keys.
   */
  function drawLaptopLight(spin: number, panel: Vec3[]) {
    const base = tones.base!
    const near = tones.near!
    const mid = tones.mid!
    const halo = tones.halo!
    const edge = tones.edge!

    // Screen wash, brightest at the top where the content is densest.
    quadPath(panel, spin)
    ctx.fillStyle = surfaceGradient(
      LID,
      spin,
      [0.5, 0],
      [0.5, 1],
      [
        [0, rgbaString(mid, 0.4)],
        [1, rgbaString(halo, 0.12)],
      ],
    )
    ctx.fill()

    /**
     * The editor.
     *
     * An activity strip, a tab bar, a gutter of line numbers and then the
     * code — the furniture, not just the text. It is what the eye actually
     * uses to recognise a screen as a screen: a field of coloured dashes
     * could be anything, but a sidebar and a row of tabs could only be one
     * thing.
     */
    const chromeTop = 0.075
    const gutter = 0.115
    const rail = 0.055

    // Activity strip down the left edge.
    quadPath(inset(panel, 0, 0, rail, 1), spin)
    ctx.fillStyle = rgbaString(halo, 0.1)
    ctx.fill()

    // Tab bar, with one tab lit as the active file.
    quadPath(inset(panel, rail, 0, 1, chromeTop), spin)
    ctx.fillStyle = rgbaString(halo, 0.08)
    ctx.fill()

    quadPath(inset(panel, rail + 0.02, 0.008, rail + 0.19, chromeTop), spin)
    ctx.fillStyle = rgbaString(mid, 0.16)
    ctx.fill()

    // Line numbers: one short dash per row, dimmer than the code.
    ctx.lineWidth = Math.max(0.8, radius * 0.006)
    for (const row of code) {
      if (row.runs.length === 0) continue
      const v = chromeTop + row.v * (1 - chromeTop)
      const a = project(onQuad(panel, rail + 0.022, v), spin)
      const b = project(onQuad(panel, rail + 0.045, v), spin)

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = rgbaString(edge, 0.3)
      ctx.stroke()
    }

    // The code itself, inside the gutter.
    ctx.lineWidth = Math.max(1, radius * 0.0085)
    for (const row of code) {
      const v = chromeTop + row.v * (1 - chromeTop)

      for (const run of row.runs) {
        const colour =
          run.tone > 0.76
            ? near
            : run.tone > 0.5
              ? halo
              : run.tone > 0.24
                ? mid
                : edge

        const a = project(onQuad(panel, gutter + run.start * 0.86, v), spin)
        const b = project(onQuad(panel, gutter + run.end * 0.86, v), spin)

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = rgbaString(colour, 0.92)
        ctx.stroke()
      }
    }

    /**
     * A specular band travelling across the lid.
     *
     * The one moving highlight in the scene that is not rotation. Glass and
     * anodised metal both do this, and the eye reads it as "hard surface"
     * faster than any amount of edge detail.
     */
    const sweep = (Math.sin(time * 0.00012) + 1) / 2
    const band = inset(
      LID,
      Math.max(0, sweep - 0.16),
      0,
      Math.min(1, sweep + 0.16),
      1,
    )
    quadPath(band, spin)
    ctx.fillStyle = surfaceGradient(
      LID,
      spin,
      [Math.max(0, sweep - 0.16), 0.5],
      [Math.min(1, sweep + 0.16), 0.5],
      [
        [0, rgbaString(near, 0)],
        [0.5, rgbaString(near, 0.05)],
        [1, rgbaString(near, 0)],
      ],
    )
    ctx.fill()

    // Screen spill on the deck, strongest at the hinge.
    quadPath(DECK, spin)
    ctx.fillStyle = surfaceGradient(
      DECK,
      spin,
      [0.5, 0],
      [0.5, 0.85],
      [
        [0, rgbaString(mid, 0.16)],
        [1, rgbaString(mid, 0)],
      ],
    )
    ctx.fill()

    // Keys, as lit faces rather than strokes.
    for (let row = 0; row < 4; row += 1) {
      const v = 0.22 + row * 0.13
      for (let key = 0; key < 12; key += 1) {
        const u = 0.11 + key * 0.064
        quadPath(inset(DECK, u, v, u + 0.048, v + 0.075), spin)
        ctx.fillStyle = rgbaString(base, 0.2)
        ctx.fill()
      }
    }

    // Trackpad: a recessed rectangle, so a bright edge and no fill.
    quadPath(inset(DECK, 0.38, 0.75, 0.62, 0.92), spin)
    ctx.lineWidth = Math.max(0.8, radius * 0.005)
    ctx.strokeStyle = rgbaString(base, 0.32)
    ctx.stroke()

    /**
     * The pool of screen light on the floor in front of the machine.
     *
     * A lit screen in a dark room throws light forward, and the floor is the
     * only surface here to catch it. Without it the laptop is lit but the
     * scene around it is not, which is the difference between an object in a
     * room and a sticker on a background.
     */
    const pool = project(onQuad(DECK, 0.5, 1), spin)
    const reach = radius * 1.3
    const spill = ctx.createRadialGradient(
      pool.x,
      pool.y,
      0,
      pool.x,
      pool.y,
      reach,
    )
    spill.addColorStop(0, rgbaString(mid, 0.14))
    spill.addColorStop(1, rgbaString(mid, 0))
    ctx.fillStyle = spill
    ctx.beginPath()
    ctx.ellipse(
      pool.x,
      pool.y + reach * 0.2,
      reach,
      reach * 0.34,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    // The lit seam along the hinge.
    const hingeLeft = project(onQuad(DECK, 0.06, 0.02), spin)
    const hingeRight = project(onQuad(DECK, 0.94, 0.02), spin)
    ctx.lineWidth = Math.max(1, radius * 0.008)
    ctx.beginPath()
    ctx.moveTo(hingeLeft.x, hingeLeft.y)
    ctx.lineTo(hingeRight.x, hingeRight.y)
    ctx.strokeStyle = rgbaString(base, 0.5)
    ctx.stroke()
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
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // The laptop sways within a narrow arc; a full rotation would spend half
    // its time showing the back of a lid.
    const sway = BASE_YAW + Math.sin(time * SWAY_SPEED) * SWAY_RADIANS
    const revolve = time * ORBIT_SPEED

    /**
     * Two passes, and the order is the design.
     *
     * Light first — atmosphere, floor, the far side of the orbit — composited
     * additively. Then the machine, opaque, which correctly hides the grid
     * behind it. Then everything the machine emits, additively again, on top
     * of its own surfaces.
     */
    ctx.globalCompositeOperation = 'lighter'
    drawAtmosphere()
    drawGrid(sway)
    drawOrbiters(sway, revolve, 'back')

    ctx.globalCompositeOperation = 'source-over'
    const panel = drawLaptopBody(sway)

    ctx.globalCompositeOperation = 'lighter'
    drawLaptopLight(sway, panel)
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

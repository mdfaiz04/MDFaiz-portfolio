import {
  mixRgb,
  rgbaString,
  toRgb,
  type ScenePalette,
  type Rgb,
} from './palette'
import { fromDegrees, worldDots } from './world'

/**
 * The contact visual: a paper plane over a dotted world.
 *
 * The argument the section makes is "reach me from anywhere", so the picture
 * is a map with routes on it and something in flight. Kept out of the React
 * component for the same reason as the workstation: this is imperative canvas
 * work with its own state, and mixing it into a component would mean a
 * re-render per frame.
 *
 * Colours arrive from the design tokens, so retuning the palette in
 * globals.css retunes this with everything else (R2).
 */

export type FlightRenderer = {
  frame(elapsed: number): void
  still(): void
  resize(width: number, height: number, dpr: number): void
  setPalette(palette: ScenePalette): void
}

type Point = { x: number; y: number }

/** A frame longer than this is a tab waking up, not a slow device. */
const MAX_FRAME_MS = 50

/** The map occupies this fraction of the canvas, centred. */
const MAP_WIDTH = 0.88
const MAP_HEIGHT = 0.62
const MAP_TOP = 0.16

/**
 * Routes, written in degrees so each one can be checked against an atlas.
 *
 * They start where the owner is and fan out, which is the point being made —
 * these are not decorative curves between arbitrary dots.
 */
const HOME: [number, number] = [76.9, 15.1]

const DESTINATIONS: [number, number][] = [
  [-74, 40.7],
  [-0.1, 51.5],
  [8.7, 50.1],
  [103.8, 1.3],
  [139.7, 35.7],
  [151.2, -33.9],
  [55.3, 25.3],
]

/** How high an arc bows, as a fraction of its span. */
const ARC_LIFT = 0.32

/** Seconds for a pulse to travel a route, and the gap between departures. */
const PULSE_TRAVEL = 2600
const PULSE_STAGGER = 420

export function createFlightRenderer(
  ctx: CanvasRenderingContext2D,
  initialPalette: ScenePalette,
): FlightRenderer {
  let tones = readTones(initialPalette)
  let width = 0
  let height = 0
  let time = 0

  function readTones(source: ScenePalette): Record<keyof ScenePalette, Rgb> {
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

  /** Fractional map position to canvas pixels. */
  function place(u: number, v: number): Point {
    const boxWidth = width * MAP_WIDTH
    const boxHeight = height * MAP_HEIGHT
    return {
      x: (width - boxWidth) / 2 + u * boxWidth,
      y: height * MAP_TOP + v * boxHeight,
    }
  }

  /**
   * A quadratic arc between two places, bowed away from the equator.
   *
   * Real great-circle routes bow toward the pole, which on a flat map is
   * upward — the same shape an airline route map draws, and the reason these
   * read as journeys rather than as connecting lines.
   */
  function arc(from: Point, to: Point) {
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const span = Math.hypot(to.x - from.x, to.y - from.y)

    return { from, to, control: { x: midX, y: midY - span * ARC_LIFT } }
  }

  function alongArc(
    curve: { from: Point; to: Point; control: Point },
    t: number,
  ): Point {
    const inverse = 1 - t
    return {
      x:
        inverse * inverse * curve.from.x +
        2 * inverse * t * curve.control.x +
        t * t * curve.to.x,
      y:
        inverse * inverse * curve.from.y +
        2 * inverse * t * curve.control.y +
        t * t * curve.to.y,
    }
  }

  const home = fromDegrees(HOME[0], HOME[1])
  const routes = DESTINATIONS.map(([longitude, latitude]) =>
    fromDegrees(longitude, latitude),
  )

  function drawMap() {
    const boxWidth = width * MAP_WIDTH
    const dot = Math.max(1, (boxWidth / 64) * 0.32)

    for (const cell of worldDots) {
      const point = place(cell.u, cell.v)

      // Dots fade toward the edges so the map dissolves into the page rather
      // than ending in a hard rectangle.
      const edgeFade =
        1 - Math.max(Math.abs(cell.u - 0.5), Math.abs(cell.v - 0.5)) * 1.1

      ctx.beginPath()
      ctx.arc(point.x, point.y, dot, 0, Math.PI * 2)
      ctx.fillStyle = rgbaString(
        tones.edge,
        0.05 + 0.17 * Math.max(0, edgeFade),
      )
      ctx.fill()
    }
  }

  function drawRoutes() {
    const origin = place(home.u, home.v)

    routes.forEach((destination, index) => {
      const target = place(destination.u, destination.v)
      const curve = arc(origin, target)

      ctx.beginPath()
      ctx.moveTo(curve.from.x, curve.from.y)
      ctx.quadraticCurveTo(
        curve.control.x,
        curve.control.y,
        curve.to.x,
        curve.to.y,
      )

      const gradient = ctx.createLinearGradient(
        curve.from.x,
        curve.from.y,
        curve.to.x,
        curve.to.y,
      )
      gradient.addColorStop(0, rgbaString(tones.halo, 0.75))
      gradient.addColorStop(1, rgbaString(tones.mid, 0.16))

      ctx.lineWidth = Math.max(1, width * 0.0012)
      ctx.strokeStyle = gradient
      ctx.stroke()

      // The destination node.
      ctx.beginPath()
      ctx.arc(target.x, target.y, Math.max(1.5, width * 0.0028), 0, Math.PI * 2)
      ctx.fillStyle = rgbaString(tones.near, 0.9)
      ctx.fill()

      // A pulse running the route, staggered so departures are not in step.
      const progress =
        ((time + index * PULSE_STAGGER) % PULSE_TRAVEL) / PULSE_TRAVEL
      const travelling = alongArc(curve, progress)
      const fade = Math.sin(progress * Math.PI)

      ctx.beginPath()
      ctx.arc(
        travelling.x,
        travelling.y,
        Math.max(1.2, width * 0.0022),
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = rgbaString(tones.pulse, 0.85 * fade)
      ctx.fill()
    })

    // Home, brightest of all.
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, Math.max(2, width * 0.004), 0, Math.PI * 2)
    ctx.fillStyle = rgbaString(tones.near, 1)
    ctx.fill()
  }

  /**
   * A paper plane, as four folded facets.
   *
   * Drawn from one nose point and one span so the whole thing scales and
   * rotates as a unit. The two dark facets are the undersides of the fold —
   * without them it reads as a flat triangle rather than as folded paper.
   */
  function drawPlane(
    centre: Point,
    size: number,
    angle: number,
    alpha: number,
  ) {
    ctx.save()
    ctx.translate(centre.x, centre.y)
    ctx.rotate(angle)

    const nose = { x: size, y: 0 }
    const tailTop = { x: -size * 0.72, y: -size * 0.62 }
    const tailLow = { x: -size * 0.72, y: size * 0.62 }
    const notch = { x: -size * 0.42, y: 0 }
    const keel = { x: -size * 0.5, y: size * 0.26 }

    const facet = (points: Point[], from: Rgb, to: Rgb, strength: number) => {
      ctx.beginPath()
      ctx.moveTo(points[0]!.x, points[0]!.y)
      for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
      ctx.closePath()

      const gradient = ctx.createLinearGradient(-size, -size, size, size)
      gradient.addColorStop(0, rgbaString(from, alpha * strength))
      gradient.addColorStop(1, rgbaString(to, alpha * strength))
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Upper wing, catching the light.
    facet([nose, tailTop, notch], tones.near, tones.mid, 0.72)
    // Lower wing, turned away from it.
    facet([nose, tailLow, notch], tones.halo, tones.base, 0.8)
    // The keel beneath, darkest.
    facet(
      [nose, notch, keel],
      mixRgb(tones.halo, tones.shellDeep, 0.45),
      tones.halo,
      0.9,
    )

    // The fold along the spine.
    ctx.beginPath()
    ctx.moveTo(nose.x, nose.y)
    ctx.lineTo(notch.x, notch.y)
    ctx.lineWidth = Math.max(1, size * 0.03)
    ctx.strokeStyle = rgbaString(tones.near, alpha * 0.8)
    ctx.stroke()

    ctx.restore()
  }

  /** The dashed trail the small plane has already flown. */
  function drawTrail(head: Point) {
    const start = place(0.12, 0.96)
    const control = { x: width * 0.34, y: height * 0.62 }

    ctx.save()
    ctx.setLineDash([width * 0.006, width * 0.012])
    ctx.lineDashOffset = -time * 0.03

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo(control.x, control.y, head.x, head.y)
    ctx.lineWidth = Math.max(1, width * 0.0016)
    ctx.strokeStyle = rgbaString(tones.edge, 0.4)
    ctx.stroke()
    ctx.restore()
  }

  /** The lit platform the whole scene sits over. */
  function drawPlatform() {
    const centre = { x: width * 0.62, y: height * 0.88 }
    const reach = width * 0.3

    const glow = ctx.createRadialGradient(
      centre.x,
      centre.y,
      0,
      centre.x,
      centre.y,
      reach,
    )
    glow.addColorStop(0, rgbaString(tones.halo, 0.5))
    glow.addColorStop(0.4, rgbaString(tones.halo, 0.12))
    glow.addColorStop(1, rgbaString(tones.halo, 0))

    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.ellipse(centre.x, centre.y, reach, reach * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Concentric rings, breathing.
    for (let ring = 1; ring <= 3; ring += 1) {
      const phase = (time * 0.0004 + ring / 3) % 1
      const radius = reach * (0.3 + phase * 0.7)

      ctx.beginPath()
      ctx.ellipse(centre.x, centre.y, radius, radius * 0.3, 0, 0, Math.PI * 2)
      ctx.lineWidth = Math.max(1, width * 0.0014)
      ctx.strokeStyle = rgbaString(tones.base, 0.32 * (1 - phase))
      ctx.stroke()
    }
  }

  function draw() {
    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    drawPlatform()
    drawMap()
    drawRoutes()

    // The small plane, high and far, on the dashed trail it has flown.
    const drift = Math.sin(time * 0.0006)
    const escort: Point = {
      x: width * 0.9,
      y: height * 0.14 + drift * height * 0.012,
    }
    drawTrail(escort)
    drawPlane(escort, width * 0.032, -0.55, 0.85)

    // The near plane, large and central, banking gently.
    const lead: Point = {
      x: width * 0.5,
      y: height * 0.52 + Math.sin(time * 0.00045) * height * 0.018,
    }
    drawPlane(lead, width * 0.125, -0.62 + drift * 0.05, 1)

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    },
    setPalette(next) {
      tones = readTones(next)
    },
  }
}

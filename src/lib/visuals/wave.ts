/**
 * The contact signal wave.
 *
 * Three offset sine curves rather than one: a single wave reads as a
 * decoration, several drifting against each other read as a signal.
 *
 * Kept out of the React component for the same reason as the brain — this is
 * imperative canvas work with its own state, and mixing it into a component
 * would mean a re-render per frame.
 */

export type WaveRenderer = {
  frame(elapsed: number): void
  still(): void
  resize(width: number, height: number, dpr: number): void
  setColours(colours: WaveColours): void
}

export type WaveColours = {
  near: string
  far: string
}

type Layer = {
  /** Vertical extent as a fraction of canvas height. */
  amplitude: number
  /** Cycles across the canvas width. */
  frequency: number
  /** Radians per millisecond. */
  speed: number
  alpha: number
  lineWidth: number
}

const LAYERS: readonly Layer[] = [
  { amplitude: 0.3, frequency: 1.6, speed: 0.00042, alpha: 0.85, lineWidth: 2 },
  {
    amplitude: 0.22,
    frequency: 2.4,
    speed: -0.00031,
    alpha: 0.5,
    lineWidth: 1.5,
  },
  { amplitude: 0.14, frequency: 3.6, speed: 0.00061, alpha: 0.3, lineWidth: 1 },
]

/** Horizontal sampling step in pixels. Smaller is smoother and slower. */
const STEP = 6

const MAX_FRAME_MS = 50

export function createWaveRenderer(
  ctx: CanvasRenderingContext2D,
  initial: WaveColours,
): WaveRenderer {
  let width = 0
  let height = 0
  let time = 0
  let colours = initial

  function render() {
    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'lighter'

    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, colours.far)
    gradient.addColorStop(0.5, colours.near)
    gradient.addColorStop(1, colours.far)

    for (const layer of LAYERS) {
      ctx.beginPath()

      for (let x = 0; x <= width; x += STEP) {
        const phase = (x / width) * Math.PI * 2 * layer.frequency
        // A half-cycle envelope pins both ends to the centre line, so the
        // wave fades into the edges instead of being cut off by them.
        const envelope = Math.sin((x / width) * Math.PI)
        const y =
          height / 2 +
          Math.sin(phase + time * layer.speed) *
            layer.amplitude *
            height *
            envelope

        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.globalAlpha = layer.alpha
      ctx.strokeStyle = gradient
      ctx.lineWidth = layer.lineWidth
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  return {
    frame(elapsed) {
      time += Math.min(elapsed, MAX_FRAME_MS)
      render()
    },

    still() {
      // A fixed phase that shows the wave at its most legible, rather than
      // whatever frame the animation happened to stop on.
      time = 0
      render()
    },

    resize(nextWidth, nextHeight, dpr) {
      width = nextWidth
      height = nextHeight
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    },

    setColours(next) {
      colours = next
    },
  }
}

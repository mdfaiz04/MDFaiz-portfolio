/**
 * The neural point cloud, generated rather than drawn.
 *
 * What makes a shape read as a brain in under a second is not the overall
 * mass — it is three specific features:
 *
 *   1. the Sylvian fissure, the deep notch separating the temporal lobe from
 *      the cerebrum
 *   2. sulci, the grooves running across the cortex
 *   3. a cerebellum set apart at the back, with a much finer fold texture
 *
 * All three are carved by *removing* points rather than by displacing them.
 * Smooth noise gives a lumpy ball; cut grooves give a brain.
 *
 * Generation is deterministic — the same seed produces the same brain on
 * every load and every machine.
 *
 * Axes: x = left/right (width), y = up/down, z = front/back (+z is forward).
 */

export type Point3 = { x: number; y: number; z: number }
export type Edge = { a: number; b: number }

export type BrainPoint = Point3 & {
  kind: 'cortex' | 'cerebellum' | 'stem' | 'interior'
}

export type BrainGeometry = {
  points: readonly BrainPoint[]
  edges: readonly Edge[]
}

type Lobe = {
  centre: Point3
  radii: Point3
  weight: number
  kind: 'cortex' | 'cerebellum'
}

/**
 * Ellipsoids whose union forms the mass. Proportioned like a real brain:
 * clearly longer front-to-back than it is tall, and narrower than it is long.
 */
const LOBES: readonly Lobe[] = [
  // Main cerebrum. Distinctly longer front-to-back than tall — a brain that
  // is as tall as it is long reads as a ball however it is textured.
  {
    centre: { x: 0, y: 0.12, z: -0.02 },
    radii: { x: 0.35, y: 0.34, z: 0.66 },
    weight: 0.4,
    kind: 'cortex',
  },
  // Frontal pole.
  {
    centre: { x: 0, y: 0.04, z: 0.46 },
    radii: { x: 0.3, y: 0.29, z: 0.3 },
    weight: 0.16,
    kind: 'cortex',
  },
  // Occipital pole.
  {
    centre: { x: 0, y: 0.04, z: -0.52 },
    radii: { x: 0.28, y: 0.27, z: 0.26 },
    weight: 0.13,
    kind: 'cortex',
  },
  // Temporal lobe — projects forward and down, below the fissure.
  {
    centre: { x: 0, y: -0.28, z: 0.14 },
    radii: { x: 0.28, y: 0.17, z: 0.36 },
    weight: 0.17,
    kind: 'cortex',
  },
  // Cerebellum, set back and low.
  {
    centre: { x: 0, y: -0.36, z: -0.44 },
    radii: { x: 0.25, y: 0.18, z: 0.23 },
    weight: 0.14,
    kind: 'cerebellum',
  },
]

const SHELL_MIN = 0.93
const EDGE_RADIUS = 0.155
const INTERIOR_SHARE = 0.1
const STEM_SHARE = 0.07
const TAU = Math.PI * 2

function createRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function insideness(point: Point3, lobe: Lobe): number {
  const dx = (point.x - lobe.centre.x) / lobe.radii.x
  const dy = (point.y - lobe.centre.y) / lobe.radii.y
  const dz = (point.z - lobe.centre.z) / lobe.radii.z
  return dx * dx + dy * dy + dz * dz
}

/**
 * Sulci. A periodic field across the surface; points falling in the narrow
 * band near zero are removed, leaving grooves between raised gyri. The
 * modulating term keeps the grooves from running as parallel stripes.
 */
function inSulcus(point: Point3, frequency: number, width: number): boolean {
  const field = Math.sin(
    frequency * point.z +
      frequency * 0.55 * point.y +
      1.6 * Math.sin(frequency * 0.7 * point.x),
  )
  return Math.abs(field) < width
}

/**
 * The Sylvian fissure — the deep horizontal cleft between the temporal lobe
 * and the rest of the cerebrum. This single feature does more for
 * recognisability than any amount of surface detail.
 */
function inSylvianFissure(point: Point3): boolean {
  if (point.z < -0.34 || point.z > 0.5) return false

  // The cleft rises slightly toward the front of the brain.
  const line = -0.12 + point.z * 0.12
  return Math.abs(point.y - line) < 0.045
}

/** The gap separating cerebellum from the occipital lobe above it. */
function inTransverseFissure(point: Point3): boolean {
  if (point.z > -0.24) return false
  return Math.abs(point.y - -0.19) < 0.035
}

export function createBrainGeometry(
  count: number,
  seed: number,
  edgeCap: number,
): BrainGeometry {
  const random = createRandom(seed)
  const points: BrainPoint[] = []

  const stemCount = Math.round(count * STEM_SHARE)
  const interiorCount = Math.round(count * INTERIOR_SHARE)
  const surfaceBudget = count - stemCount - interiorCount

  // --- cortical surface --------------------------------------------------
  for (const [index, lobe] of LOBES.entries()) {
    const target = Math.round(surfaceBudget * lobe.weight)
    const isCerebellum = lobe.kind === 'cerebellum'

    // The cerebellum's folia are much finer than cerebral gyri, and that
    // contrast is a large part of why the region reads as a cerebellum.
    const frequency = isCerebellum ? 46 : 15
    const grooveWidth = isCerebellum ? 0.3 : 0.2

    let placed = 0
    let attempts = 0

    while (placed < target && attempts < target * 30) {
      attempts += 1

      const theta = random() * TAU
      const phi = Math.acos(2 * random() - 1)
      const sinPhi = Math.sin(phi)
      const shell = SHELL_MIN + random() * (1 - SHELL_MIN)

      const candidate: Point3 = {
        x: lobe.centre.x + sinPhi * Math.cos(theta) * lobe.radii.x * shell,
        y: lobe.centre.y + Math.cos(phi) * lobe.radii.y * shell,
        z: lobe.centre.z + sinPhi * Math.sin(theta) * lobe.radii.z * shell,
      }

      // Points buried inside a neighbouring lobe are interior to the union
      // and would show through the silhouette.
      let buried = false
      for (const [otherIndex, other] of LOBES.entries()) {
        if (otherIndex === index) continue
        if (insideness(candidate, other) < 0.93) {
          buried = true
          break
        }
      }
      if (buried) continue

      if (inSulcus(candidate, frequency, grooveWidth)) continue
      if (inSylvianFissure(candidate)) continue
      if (inTransverseFissure(candidate)) continue

      points.push({ ...candidate, kind: lobe.kind })
      placed += 1
    }
  }

  // --- interior ----------------------------------------------------------
  // A sparse scatter so the cloud reads as volume rather than an empty husk.
  for (let i = 0; i < interiorCount; i += 1) {
    const lobe = LOBES[Math.floor(random() * LOBES.length)]
    if (!lobe) continue

    const theta = random() * TAU
    const phi = Math.acos(2 * random() - 1)
    const sinPhi = Math.sin(phi)
    const depth = 0.3 + random() * 0.45

    points.push({
      x: lobe.centre.x + sinPhi * Math.cos(theta) * lobe.radii.x * depth,
      y: lobe.centre.y + Math.cos(phi) * lobe.radii.y * depth,
      z: lobe.centre.z + sinPhi * Math.sin(theta) * lobe.radii.z * depth,
      kind: 'interior',
    })
  }

  // --- brainstem ---------------------------------------------------------
  // Curves down and slightly forward, thick at the top where it meets the
  // brain and tapering toward the platform.
  for (let i = 0; i < stemCount; i += 1) {
    const t = i / Math.max(1, stemCount - 1)
    const angle = random() * TAU
    const radius = (0.115 - t * 0.06) * (0.6 + random() * 0.4)

    // Slight forward lean, as the real brainstem has.
    const centreZ = -0.2 + t * t * 0.14

    points.push({
      x: Math.cos(angle) * radius,
      y: -0.26 - t * 0.56,
      z: centreZ + Math.sin(angle) * radius * 0.8,
      kind: 'stem',
    })
  }

  // --- synapses ----------------------------------------------------------
  const candidates: { a: number; b: number; d2: number }[] = []
  const limit = EDGE_RADIUS * EDGE_RADIUS

  for (let i = 0; i < points.length; i += 1) {
    const first = points[i]
    if (!first) continue

    for (let j = i + 1; j < points.length; j += 1) {
      const second = points[j]
      if (!second) continue

      const dx = first.x - second.x
      const dy = first.y - second.y
      const dz = first.z - second.z
      const d2 = dx * dx + dy * dy + dz * dz

      if (d2 <= limit) candidates.push({ a: i, b: j, d2 })
    }
  }

  candidates.sort((left, right) => left.d2 - right.d2)

  const edges: Edge[] = candidates
    .slice(0, edgeCap)
    .map(({ a, b }) => ({ a, b }))

  return { points, edges }
}

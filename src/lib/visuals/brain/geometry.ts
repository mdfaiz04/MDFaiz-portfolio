/**
 * The neural point cloud, generated rather than drawn.
 *
 * Built as an anatomical silhouette in sagittal (side) profile: frontal and
 * occipital bulges, a temporal lobe, cerebellum, and a brainstem descending
 * toward the platform. Sampling each lobe and then culling points that fall
 * inside a neighbour yields the union *surface* — without that cull the lobes
 * read as overlapping balls rather than one organ.
 *
 * Generation is deterministic: the same seed produces the same brain on every
 * load and on every machine.
 *
 * Axes: x = left/right (width), y = up/down, z = front/back.
 */

export type Point3 = { x: number; y: number; z: number }
export type Edge = { a: number; b: number }

export type BrainPoint = Point3 & {
  /** Cortex points carry the glow; stem and interior sit quieter. */
  kind: 'cortex' | 'stem' | 'interior'
}

export type BrainGeometry = {
  points: readonly BrainPoint[]
  edges: readonly Edge[]
}

type Lobe = {
  centre: Point3
  radii: Point3
  weight: number
}

/**
 * Overlapping ellipsoids whose union reads as a brain from the side.
 * Tuned by silhouette rather than by anatomy textbook — what matters is that
 * a viewer recognises it in under a second.
 */
const LOBES: readonly Lobe[] = [
  // Main cerebrum.
  {
    centre: { x: 0, y: 0.16, z: -0.02 },
    radii: { x: 0.4, y: 0.42, z: 0.56 },
    weight: 0.34,
  },
  // Frontal bulge.
  {
    centre: { x: 0, y: 0.14, z: 0.4 },
    radii: { x: 0.34, y: 0.33, z: 0.3 },
    weight: 0.18,
  },
  // Occipital bulge.
  {
    centre: { x: 0, y: 0.08, z: -0.46 },
    radii: { x: 0.32, y: 0.31, z: 0.26 },
    weight: 0.16,
  },
  // Temporal lobe, projecting forward and down.
  {
    centre: { x: 0, y: -0.24, z: 0.16 },
    radii: { x: 0.29, y: 0.2, z: 0.36 },
    weight: 0.18,
  },
  // Cerebellum, tucked under the back.
  {
    centre: { x: 0, y: -0.34, z: -0.4 },
    radii: { x: 0.25, y: 0.19, z: 0.24 },
    weight: 0.14,
  },
]

/** Points sit in a thin shell rather than filling the volume. */
const SHELL_MIN = 0.9

/** Amplitude of the surface undulation that suggests cortical folds. */
const FOLD_DEPTH = 0.07

/** Neighbours closer than this become synapses. */
const EDGE_RADIUS = 0.19

/** Share of the budget spent on faint interior structure. */
const INTERIOR_SHARE = 0.12

/** Share of the budget spent on the brainstem. */
const STEM_SHARE = 0.06

const TAU = Math.PI * 2

/** mulberry32 — small, fast, and seeded so the geometry is reproducible. */
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

/** Normalised ellipsoid distance: below 1 is inside. */
function insideness(point: Point3, lobe: Lobe): number {
  const dx = (point.x - lobe.centre.x) / lobe.radii.x
  const dy = (point.y - lobe.centre.y) / lobe.radii.y
  const dz = (point.z - lobe.centre.z) / lobe.radii.z
  return dx * dx + dy * dy + dz * dz
}

/**
 * Layered sines standing in for cortical folding. Two frequencies rather than
 * one, so the ridges do not fall into an obvious repeating band.
 */
function fold(theta: number, phi: number): number {
  return (
    1 +
    FOLD_DEPTH * Math.sin(theta * 6) * Math.sin(phi * 5) +
    FOLD_DEPTH * 0.55 * Math.sin(theta * 11 + 1.7) * Math.cos(phi * 9)
  )
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
  const cortexBudget = count - stemCount - interiorCount

  // --- cortex surface ---------------------------------------------------
  for (const [index, lobe] of LOBES.entries()) {
    const target = Math.round(cortexBudget * lobe.weight)
    let placed = 0
    let attempts = 0

    // Rejection sampling: a surface point that lies inside another lobe is
    // interior to the union and would show through the silhouette.
    while (placed < target && attempts < target * 12) {
      attempts += 1

      const theta = random() * TAU
      const phi = Math.acos(2 * random() - 1)
      const sinPhi = Math.sin(phi)

      const scale = (SHELL_MIN + random() * (1 - SHELL_MIN)) * fold(theta, phi)

      const candidate: Point3 = {
        x: lobe.centre.x + sinPhi * Math.cos(theta) * lobe.radii.x * scale,
        y: lobe.centre.y + Math.cos(phi) * lobe.radii.y * scale,
        z: lobe.centre.z + sinPhi * Math.sin(theta) * lobe.radii.z * scale,
      }

      let buried = false
      for (const [otherIndex, other] of LOBES.entries()) {
        if (otherIndex === index) continue
        if (insideness(candidate, other) < 0.94) {
          buried = true
          break
        }
      }

      if (buried) continue

      points.push({ ...candidate, kind: 'cortex' })
      placed += 1
    }
  }

  // --- interior structure ------------------------------------------------
  // A sparse scatter inside the shell. The reference image reads as volume
  // rather than as an empty husk, and this is what supplies that.
  for (let i = 0; i < interiorCount; i += 1) {
    const lobe = LOBES[Math.floor(random() * LOBES.length)]
    if (!lobe) continue

    const theta = random() * TAU
    const phi = Math.acos(2 * random() - 1)
    const sinPhi = Math.sin(phi)
    const depth = 0.25 + random() * 0.5

    points.push({
      x: lobe.centre.x + sinPhi * Math.cos(theta) * lobe.radii.x * depth,
      y: lobe.centre.y + Math.cos(phi) * lobe.radii.y * depth,
      z: lobe.centre.z + sinPhi * Math.sin(theta) * lobe.radii.z * depth,
      kind: 'interior',
    })
  }

  // --- brainstem ---------------------------------------------------------
  // Descends toward the platform, tapering then flaring, so the brain reads
  // as sitting on the light rather than floating above it.
  for (let i = 0; i < stemCount; i += 1) {
    const t = i / Math.max(1, stemCount - 1)
    const angle = random() * TAU
    const radius = (0.11 - t * 0.055) * (0.55 + random() * 0.45)

    points.push({
      x: Math.cos(angle) * radius,
      y: -0.34 - t * 0.5,
      z: -0.16 + Math.sin(angle) * radius + t * 0.06,
      kind: 'stem',
    })
  }

  // --- synapses ----------------------------------------------------------
  // Nearest neighbours only. Arbitrary long connections read as noise; short
  // ones read as structure.
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

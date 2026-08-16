/**
 * The neural point cloud, generated rather than drawn.
 *
 * Roughly 6 KB of code replaces a ~500 KB image, stays crisp at every
 * resolution, recolours itself from design tokens, and genuinely rotates in
 * three dimensions — which a flat picture of a 3D object cannot do.
 *
 * Generation is deterministic: the same seed produces the same brain on every
 * load and on every machine, so the hero never renders differently between
 * the server preview and the visitor's screen.
 */

export type Point3 = { x: number; y: number; z: number }
export type Edge = { a: number; b: number }

export type BrainGeometry = {
  points: readonly Point3[]
  edges: readonly Edge[]
}

/** Ellipsoid region the cloud is sampled from. */
type Lobe = {
  centre: Point3
  radii: Point3
  /** Share of the total point budget. */
  weight: number
}

/**
 * Two cerebral hemispheres and a cerebellum. Deeper than it is wide and
 * taller than it is deep, which is what reads as a brain rather than as a
 * sphere.
 */
const LOBES: readonly Lobe[] = [
  {
    centre: { x: -0.3, y: 0.08, z: 0 },
    radii: { x: 0.46, y: 0.6, z: 0.74 },
    weight: 0.4,
  },
  {
    centre: { x: 0.3, y: 0.08, z: 0 },
    radii: { x: 0.46, y: 0.6, z: 0.74 },
    weight: 0.4,
  },
  {
    centre: { x: 0, y: -0.52, z: -0.26 },
    radii: { x: 0.34, y: 0.26, z: 0.32 },
    weight: 0.2,
  },
]

/** Points sit in a thin shell rather than filling the volume. */
const SHELL_MIN = 0.86

/** Amplitude of the surface undulation that suggests cortical folds. */
const FOLD_DEPTH = 0.055

/** Neighbours closer than this become synapses. */
const EDGE_RADIUS = 0.34

const TAU = Math.PI * 2

/**
 * mulberry32 — small, fast, and good enough for scattering points.
 * Seeded explicitly so the geometry is reproducible.
 */
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

function squaredDistance(a: Point3, b: Point3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

/**
 * Build the cloud and its synapses.
 *
 * @param count  total points; scaled down on small screens by the caller
 * @param seed   any integer — the same value always yields the same brain
 * @param edgeCap hard ceiling on synapses, the main lever on frame rate
 */
export function createBrainGeometry(
  count: number,
  seed: number,
  edgeCap: number,
): BrainGeometry {
  const random = createRandom(seed)
  const points: Point3[] = []

  for (const lobe of LOBES) {
    const lobeCount = Math.round(count * lobe.weight)

    for (let i = 0; i < lobeCount; i += 1) {
      // Uniform direction on a sphere. Using acos here rather than a plain
      // random angle avoids the clustering at the poles that makes a
      // generated cloud look machine-made.
      const theta = random() * TAU
      const phi = Math.acos(2 * random() - 1)

      const sinPhi = Math.sin(phi)
      const dirX = sinPhi * Math.cos(theta)
      const dirY = Math.cos(phi)
      const dirZ = sinPhi * Math.sin(theta)

      const shell = SHELL_MIN + random() * (1 - SHELL_MIN)
      const fold = 1 + FOLD_DEPTH * Math.sin(theta * 5) * Math.sin(phi * 4)
      const scale = shell * fold

      points.push({
        x: lobe.centre.x + dirX * lobe.radii.x * scale,
        y: lobe.centre.y + dirY * lobe.radii.y * scale,
        z: lobe.centre.z + dirZ * lobe.radii.z * scale,
      })
    }
  }

  // Collect candidate synapses, then keep the shortest. Nearest-neighbour
  // connections read as structure; arbitrary long ones read as noise.
  const candidates: { a: number; b: number; d2: number }[] = []
  const limit = EDGE_RADIUS * EDGE_RADIUS

  for (let i = 0; i < points.length; i += 1) {
    const first = points[i]
    if (!first) continue

    for (let j = i + 1; j < points.length; j += 1) {
      const second = points[j]
      if (!second) continue

      const d2 = squaredDistance(first, second)
      if (d2 <= limit) candidates.push({ a: i, b: j, d2 })
    }
  }

  candidates.sort((left, right) => left.d2 - right.d2)

  const edges: Edge[] = candidates
    .slice(0, edgeCap)
    .map(({ a, b }) => ({ a, b }))

  return { points, edges }
}

import { describe, expect, it } from 'vitest'

import { createBrainGeometry } from './geometry'

const SEED = 20260415

describe('brain geometry', () => {
  it('produces an identical cloud for the same seed', () => {
    const first = createBrainGeometry(220, SEED, 350)
    const second = createBrainGeometry(220, SEED, 350)

    expect(second.points).toEqual(first.points)
    expect(second.edges).toEqual(first.edges)
  })

  it('produces a different cloud for a different seed', () => {
    const first = createBrainGeometry(220, SEED, 350)
    const other = createBrainGeometry(220, SEED + 1, 350)

    expect(other.points).not.toEqual(first.points)
  })

  it('respects the edge cap, which is the frame-rate lever', () => {
    const capped = createBrainGeometry(220, SEED, 40)
    expect(capped.edges.length).toBeLessThanOrEqual(40)
  })

  it('scales the point budget down for small screens', () => {
    const desktop = createBrainGeometry(220, SEED, 350)
    const mobile = createBrainGeometry(120, SEED, 350)

    expect(mobile.points.length).toBeLessThan(desktop.points.length)
  })

  it('keeps every point inside the unit volume', () => {
    // The renderer scales by canvas size, so a stray point would project
    // outside the canvas rather than simply looking wrong.
    for (const point of createBrainGeometry(220, SEED, 350).points) {
      expect(Math.abs(point.x)).toBeLessThan(1)
      expect(Math.abs(point.y)).toBeLessThan(1)
      expect(Math.abs(point.z)).toBeLessThan(1)
    }
  })

  it('only connects points to other points that exist', () => {
    const { points, edges } = createBrainGeometry(220, SEED, 350)

    for (const edge of edges) {
      expect(edge.a).toBeGreaterThanOrEqual(0)
      expect(edge.b).toBeLessThan(points.length)
      expect(edge.a).not.toBe(edge.b)
    }
  })

  it('builds a connected-looking network rather than isolated dust', () => {
    const { points, edges } = createBrainGeometry(220, SEED, 350)
    const connected = new Set<number>()

    for (const edge of edges) {
      connected.add(edge.a)
      connected.add(edge.b)
    }

    // Most nodes should carry at least one synapse, or the cloud reads as
    // scattered specks instead of a network.
    expect(connected.size).toBeGreaterThan(points.length * 0.6)
  })
})

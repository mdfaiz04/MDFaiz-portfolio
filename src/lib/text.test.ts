import { describe, expect, it } from 'vitest'

import {
  profile,
  featuredSkills,
  brandedTechnologies,
  allTechnologies,
} from '@/content'

import { splitName } from './text'

/**
 * The hero derives more from content than any other section — a split name, a
 * budgeted list, a filtered set of logos. Each of those is a place a content
 * edit could quietly produce something wrong on the most-seen screen.
 */

describe('splitName', () => {
  it('separates the accented first word from the rest', () => {
    expect(splitName('MD Faiz')).toEqual({ lead: 'MD', rest: 'Faiz' })
  })

  it('handles a three-part name without losing any of it', () => {
    const { lead, rest } = splitName('Ada Byron Lovelace')
    expect(`${lead} ${rest}`).toBe('Ada Byron Lovelace')
  })

  it('survives a single-word name', () => {
    expect(splitName('Prince')).toEqual({ lead: 'Prince', rest: '' })
  })

  it('renders the real name back exactly as content spells it', () => {
    const { lead, rest } = splitName(profile.name)
    expect(`${lead} ${rest}`.trim()).toBe(profile.name)
  })
})

describe('the hero leads with real capabilities', () => {
  it('features some clusters but not all of them', () => {
    expect(featuredSkills.length).toBeGreaterThan(0)
    expect(featuredSkills.length).toBeLessThan(6)
  })

  it('highlights only words that appear in the tagline', () => {
    const spoken = profile.tagline.toLowerCase()
    for (const word of profile.taglineHighlights) {
      expect(spoken).toContain(word.toLowerCase())
    }
  })
})

describe('the logo strip cannot advertise something unused', () => {
  it('shows only technologies the CV actually names', () => {
    for (const brand of brandedTechnologies) {
      expect(allTechnologies).toContain(brand.technology)
    }
  })

  it('shows a meaningful number of them', () => {
    expect(brandedTechnologies.length).toBeGreaterThanOrEqual(8)
  })

  it('carries drawable geometry and a valid colour for each', () => {
    for (const brand of brandedTechnologies) {
      expect(brand.path.length).toBeGreaterThan(20)
      expect(brand.hex).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

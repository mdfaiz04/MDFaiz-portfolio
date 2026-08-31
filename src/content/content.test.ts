import { describe, expect, it } from 'vitest'

import {
  achievements,
  careerStart,
  checkReferentialIntegrity,
  counts,
  education,
  experience,
  experienceSince,
  profile,
  projects,
  projectCategoryLabels,
  sections,
  skills,
  technologies,
  visibleSections,
} from './index'
import {
  formatDuration,
  formatMonth,
  formatRange,
  monthsBetween,
} from './format'

/** Fixed clock so date-dependent assertions never rot. */
const AS_OF = new Date(Date.UTC(2026, 7, 15)) // 2026-08-15

describe('content validates on import', () => {
  it('loads every collection', () => {
    expect(profile.name).toBeTruthy()
    expect(experience.length).toBeGreaterThan(0)
    expect(projects.length).toBeGreaterThan(0)
    expect(skills.length).toBeGreaterThan(0)
    expect(education.length).toBeGreaterThan(0)
    expect(sections.length).toBeGreaterThan(0)
  })

  it('gives every project a category with a display label', () => {
    for (const project of projects) {
      expect(projectCategoryLabels[project.category]).toBeTruthy()
    }
  })

  it('keeps exactly one current role', () => {
    const current = experience.filter((role) => role.end === null)
    expect(current).toHaveLength(1)
  })
})

describe('referential integrity is enforced, not assumed', () => {
  it('accepts the real content', () => {
    expect(
      checkReferentialIntegrity({ projects, skills, experience, sections }),
    ).toEqual([])
  })

  it('rejects a skill citing a project that does not exist', () => {
    const problems = checkReferentialIntegrity({
      projects: [{ id: 'real-project' }],
      skills: [{ id: 'a-cluster', evidence: ['ghost-project'] }],
      experience,
      sections,
    })

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('ghost-project')
    expect(problems[0]).toContain('real-project')
  })

  it('rejects duplicate project ids', () => {
    const problems = checkReferentialIntegrity({
      projects: [{ id: 'twin' }, { id: 'twin' }],
      skills: [],
      experience,
      sections,
    })

    expect(problems.some((p) => p.includes('Duplicate project id'))).toBe(true)
  })

  it('rejects two sections claiming the same order', () => {
    const problems = checkReferentialIntegrity({
      projects,
      skills: [],
      experience,
      sections: [
        { id: 'one', order: 0 },
        { id: 'two', order: 0 },
      ],
    })

    expect(problems.some((p) => p.includes('share order'))).toBe(true)
  })
})

describe('statistics are derived, never typed', () => {
  it('counts projects by counting projects', () => {
    expect(counts.projects).toBe(projects.length)
  })

  it('derives the technology count from project stacks', () => {
    const union = new Set(projects.flatMap((project) => project.stack))
    expect(counts.technologies).toBe(union.size)
    expect(technologies).toHaveLength(union.size)
  })

  it('deduplicates technologies shared across projects', () => {
    expect(new Set(technologies).size).toBe(technologies.length)
  })

  it('counts placements from achievement kinds', () => {
    expect(counts.placements).toBe(
      achievements.filter((entry) => entry.kind === 'placement').length,
    )
  })

  it('takes career start from the earliest role', () => {
    const earliest = [...experience].sort((a, b) =>
      a.start.localeCompare(b.start),
    )[0]
    expect(careerStart).toBe(earliest?.start)
  })

  it('measures experience against an explicit clock', () => {
    // Career starts Feb 2026; as of Aug 2026 that is six ELAPSED months.
    expect(experienceSince(AS_OF).months).toBe(6)
    expect(experienceSince(AS_OF).label).toBe('6 months')
  })

  it('never rounds experience up', () => {
    // The month in progress must not be counted as complete.
    const oneMonthIn = new Date(Date.UTC(2026, 2, 10)) // 2026-03-10
    expect(experienceSince(oneMonthIn).months).toBe(1)
  })
})

describe('the section registry drives the site', () => {
  it('hides sections that are not enabled', () => {
    const hidden = sections.filter((section) => !section.enabled)
    for (const section of hidden) {
      expect(visibleSections.map((s) => s.id)).not.toContain(section.id)
    }
  })

  it('returns visible sections in story order', () => {
    const orders = visibleSections.map((section) => section.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  /**
   * The five-stage journey is the site's spine, and every stage still has to
   * happen — but not every stage is still its own section.
   *
   * `interaction` moved into the hero: at the foot of the page almost nobody
   * reached the assistant, so it now sits beside the introduction. A section
   * carries one stage, so the hero cannot declare both, and the registry can
   * only show four. The assertion below therefore checks the four that remain
   * sections AND that the stage which moved is still accounted for, so
   * deleting the assistant outright fails rather than passing quietly.
   */
  it('covers every stage of the visitor journey', () => {
    const visible = new Set(visibleSections.map((section) => section.stage))
    expect(visible).toEqual(
      new Set(['attention', 'understanding', 'proof', 'connection']),
    )

    const moved = sections.find((section) => section.stage === 'interaction')
    expect(moved).toBeDefined()
    expect(moved?.enabled).toBe(false)
  })
})

describe('date formatting', () => {
  it('renders an ISO year-month as a readable month', () => {
    expect(formatMonth('2026-04')).toBe('Apr 2026')
  })

  it('renders a closed range', () => {
    expect(formatRange('2026-02', '2026-03')).toBe('Feb 2026 — Mar 2026')
  })

  it('renders an open range as Present', () => {
    expect(formatRange('2026-04', null)).toContain('Present')
  })

  it('counts elapsed months, not months touched', () => {
    expect(monthsBetween('2026-02', '2026-03', AS_OF)).toBe(1)
    expect(monthsBetween('2026-04', null, AS_OF)).toBe(4)
  })

  it('pluralises durations correctly', () => {
    expect(formatDuration(1)).toBe('1 month')
    expect(formatDuration(7)).toBe('7 months')
    expect(formatDuration(12)).toBe('1 year')
    expect(formatDuration(13)).toBe('1 year 1 month')
    expect(formatDuration(26)).toBe('2 years 2 months')
  })
})

describe('facts match the CV', () => {
  it('uses the CV email address', () => {
    expect(profile.email).toBe('faiz31807@gmail.com')
  })

  it('publishes both social links', () => {
    const socials = profile.links.filter((link) => link.kind === 'social')
    expect(socials.map((link) => link.label).sort()).toEqual([
      'GitHub',
      'LinkedIn',
    ])
  })

  it('does not put the phone number in a public link', () => {
    const hrefs = profile.links.map((link) => link.href).join(' ')
    expect(hrefs).not.toContain('7892633149')
  })

  it('records both internships', () => {
    expect(experience.map((role) => role.org).sort()).toEqual([
      'India Space Lab',
      'Metawurks AI',
    ])
  })

  it('records both competition placements', () => {
    expect(counts.placements).toBe(2)
  })
})

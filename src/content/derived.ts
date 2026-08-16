import { achievements } from './achievements'
import { experience } from './experience'
import { formatDuration, monthsBetween } from './format'
import { projects } from './projects'
import { sections } from './sections'
import { skills } from './skills'

/**
 * Everything computed from content (R5).
 *
 * Nothing in this file is typed by hand. Add a project and the counters move
 * on their own — they cannot drift out of sync with the sections below them,
 * because there is no second copy of the number.
 */

/** Sections that should render, in story order. */
export const visibleSections = sections
  .filter((section) => section.enabled)
  .sort((a, b) => a.order - b.order)

/** Every distinct technology named across all projects. */
export const technologies = [
  ...new Set(projects.flatMap((project) => project.stack)),
].sort((a, b) => a.localeCompare(b))

/** Counts that do not depend on the current date. */
export const counts = {
  projects: projects.length,
  technologies: technologies.length,
  placements: achievements.filter((entry) => entry.kind === 'placement').length,
  skillClusters: skills.length,
  roles: experience.length,
} as const

/** Earliest role start across the whole history, e.g. `"2026-02"`. */
export const careerStart = experience.reduce(
  (earliest, role) => (role.start < earliest ? role.start : earliest),
  experience[0]?.start ?? '',
)

/**
 * Time-dependent, so it takes `asOf` explicitly rather than calling
 * `new Date()` at module scope. A module-level clock read would produce a
 * different value on the server than in the browser and trigger a hydration
 * mismatch — this signature makes the dependency impossible to forget.
 *
 * Call it from a Server Component and pass the result down as a plain value.
 */
export function experienceSince(asOf: Date): {
  months: number
  label: string
} {
  const months = careerStart ? monthsBetween(careerStart, null, asOf) : 0
  return { months, label: formatDuration(months) }
}

export type Counts = typeof counts

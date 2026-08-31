import {
  achievements,
  counts,
  education,
  experience,
  experienceSince,
  formatMonth,
  profile,
  projectCategoryLabels,
  projects,
  skills,
} from '@/content'

import {
  capitalise,
  condense,
  list,
  plainProject,
  plural,
  spell,
} from './explain'

/**
 * Judgement, derived.
 *
 * "How is this person?" is the question a portfolio exists to answer, and the
 * first version of this assistant refused it — there was no fact in the CV
 * shaped like an opinion, so it said it did not know. That was the wrong
 * answer to the right question.
 *
 * The fix is not to write opinions into the content. It is to work out which
 * claims the evidence already supports, and to carry the evidence with the
 * claim so every judgement can be checked in one glance:
 *
 *   claim   — the judgement, in plain words
 *   because — the fact it rests on, quoted from content
 *
 * Every trait below is guarded by the data that justifies it. Delete the
 * competition results and the "judged externally" trait disappears rather
 * than becoming a lie. That is the difference between a derived opinion and
 * a hardcoded one.
 */

export type Trait = {
  id: string
  claim: string
  because: string
  sources: readonly string[]
}

const skillTitles = skills.map((cluster) => cluster.title)
const skillSources = skills.map((cluster) => `skill:${cluster.id}`)
const projectSources = projects.map((project) => `project:${project.id}`)

/** The current role, if there is one. `end: null` means ongoing. */
const currentRole = experience.find((role) => role.end === null)

/** Biggest surface area is the fairest single proxy for "most complete". */
const largestProject = [...projects].sort(
  (a, b) => b.stack.length - a.stack.length,
)[0]

const categoryLabels = [
  ...new Set(
    projects.map((project) => projectCategoryLabels[project.category]),
  ),
]

const placements = achievements.filter((award) => award.kind === 'placement')

/**
 * Strengths the evidence supports, strongest first.
 *
 * Ordering is by how hard the claim is to fake: work someone else judged
 * outranks work that is merely finished, which outranks breadth.
 */
export function strengths(): Trait[] {
  const traits: Trait[] = []

  if (currentRole) {
    traits.push({
      id: 'current',
      claim: 'Already doing the work, not just studying it.',
      because: `${currentRole.role} at ${currentRole.org} since ${formatMonth(currentRole.start)} — ${condense(currentRole.summary, 20)}`,
      sources: [`experience:${currentRole.id}`],
    })
  }

  if (placements.length > 0) {
    traits.push({
      id: 'judged',
      claim: 'The work has been judged outside the classroom.',
      because: `${capitalise(plural(placements.length, 'competition placement'))}: ${list(
        placements.map((award) => `${award.title} at the ${award.event}`),
      )}.`,
      sources: placements.map((award) => `achievement:${award.id}`),
    })
  }

  if (largestProject) {
    const plain = plainProject(largestProject)
    traits.push({
      id: 'ships',
      claim: 'Finishes things, and can say what came out of them.',
      because: `${capitalise(plural(projects.length, 'project'))}, each with a stated result. The largest runs on ${spell(largestProject.stack.length)} technologies — ${plain.result}`,
      sources: projectSources,
    })
  }

  if (skills.length >= 3) {
    traits.push({
      id: 'range',
      claim: 'Works across the whole stack rather than one layer of it.',
      because: `${capitalise(plural(skills.length, 'capability area'))} — ${list(skillTitles)} — and ${counts.technologies} technologies used across the projects.`,
      sources: skillSources,
    })
  }

  if (categoryLabels.length >= 3) {
    traits.push({
      id: 'span',
      claim: 'Picks up unfamiliar domains quickly.',
      because: `The ${plural(projects.length, 'project')} sit in ${plural(categoryLabels.length, 'different field')} — ${list(categoryLabels)}.`,
      sources: projectSources,
    })
  }

  return traits
}

/**
 * The honest other half.
 *
 * A recruiter asking about weaknesses has already assumed there are some, so
 * dodging costs more credibility than answering. Each of these is a fact, not
 * an apology — and each one dissolves on its own when the CV changes.
 */
export function limits(asOf: Date): Trait[] {
  const traits: Trait[] = []
  const tenure = experienceSince(asOf)
  const studying = education.find((entry) => entry.endYear > asOf.getFullYear())

  if (tenure.months > 0) {
    traits.push({
      id: 'early',
      claim: 'This is early-career work.',
      because: `${capitalise(tenure.label)} of professional experience across ${plural(counts.roles, 'role')}.`,
      sources: experience.map((role) => `experience:${role.id}`),
    })
  }

  if (studying) {
    traits.push({
      id: 'studying',
      claim: 'Still mid-degree.',
      because: `${studying.qualification}${studying.field ? ` (${studying.field})` : ''} at ${studying.institution}, finishing ${studying.endYear} — currently ${studying.score.label} ${studying.score.value}.`,
      sources: [`education:${studying.id}`],
    })
  }

  if (projects.every((project) => project.links.length === 0)) {
    traits.push({
      id: 'unpublished',
      claim: 'The code is not public yet.',
      because: `All ${plural(projects.length, 'project')} are described here in full, but the repositories are not linked yet.`,
      sources: projectSources,
    })
  }

  return traits
}

/**
 * The one-line verdict that opens an assessment.
 *
 * Assembled from whichever facts exist rather than written down, so it stays
 * true as the CV grows.
 */
export function verdict(): string {
  const doing = currentRole
    ? `already working as a ${currentRole.role.toLowerCase()} at ${currentRole.org}`
    : 'building independently'

  const behind = [
    plural(projects.length, 'finished project'),
    ...(placements.length > 0
      ? [plural(placements.length, 'competition placement')]
      : []),
  ]

  return `An early-career ${profile.role}, ${doing}, with ${list(behind)} behind him.`
}

/** Sources behind `verdict`, so even the summary line stays checkable. */
export function verdictSources(): string[] {
  return [
    ...(currentRole ? [`experience:${currentRole.id}`] : []),
    ...projectSources,
    ...placements.map((award) => `achievement:${award.id}`),
  ]
}

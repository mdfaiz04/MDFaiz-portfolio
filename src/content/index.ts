import { z } from 'zod'

import { achievements as rawAchievements } from './achievements'
import { brands as rawBrands } from './brands'
import { socials as rawSocials } from './socials'
import { education as rawEducation } from './education'
import { experience as rawExperience } from './experience'
import { profile as rawProfile } from './profile'
import { projects as rawProjects } from './projects'
import {
  AchievementSchema,
  BrandMarkSchema,
  SocialMarkSchema,
  EducationSchema,
  ExperienceSchema,
  ProfileSchema,
  ProjectSchema,
  SectionSchema,
  SkillClusterSchema,
} from './schema'
import { sections as rawSections } from './sections'
import { skills as rawSkills } from './skills'

/**
 * The single entry point to the content layer.
 *
 * Importing this module validates every fact in the project. A malformed
 * date, a missing field, or a skill citing a project that does not exist
 * fails the BUILD — it never reaches the live site as a blank space.
 */

// ---------------------------------------------------------------------------
// Shape validation
// ---------------------------------------------------------------------------

/** Parse one collection, prefixing any issue with where it came from. */
function parseOrThrow<T>(
  label: string,
  schema: z.ZodType<T>,
  data: unknown,
): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  ${label}.${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid content in ${label}:\n${detail}`)
  }

  return result.data
}

export const profile = parseOrThrow('profile', ProfileSchema, rawProfile)
export const experience = parseOrThrow(
  'experience',
  z.array(ExperienceSchema).min(1),
  rawExperience,
)
export const projects = parseOrThrow(
  'projects',
  z.array(ProjectSchema).min(1),
  rawProjects,
)
export const skills = parseOrThrow(
  'skills',
  z.array(SkillClusterSchema).min(1),
  rawSkills,
)
export const achievements = parseOrThrow(
  'achievements',
  z.array(AchievementSchema),
  rawAchievements,
)
export const education = parseOrThrow(
  'education',
  z.array(EducationSchema).min(1),
  rawEducation,
)
export const sections = parseOrThrow(
  'sections',
  z.array(SectionSchema).min(1),
  rawSections,
)
export const brands = parseOrThrow(
  'brands',
  z.array(BrandMarkSchema),
  rawBrands,
)
export const socials = parseOrThrow(
  'socials',
  z.array(SocialMarkSchema),
  rawSocials,
)

// ---------------------------------------------------------------------------
// Referential integrity
// ---------------------------------------------------------------------------

/** Minimal shapes these checks need — kept loose so tests can pass fixtures. */
type IntegrityInput = {
  projects: readonly { id: string }[]
  skills: readonly { id: string; evidence: readonly string[] }[]
  experience: readonly { id: string }[]
  sections: readonly { id: string; order: number }[]
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }

  return [...duplicates]
}

/**
 * Cross-collection rules that no single schema can express.
 *
 * Exported and pure so the test suite can prove it rejects bad data, rather
 * than only proving it accepts the good data that happens to be in the repo.
 */
export function checkReferentialIntegrity(input: IntegrityInput): string[] {
  const problems: string[] = []
  const projectIds = new Set(input.projects.map((project) => project.id))

  for (const cluster of input.skills) {
    for (const id of cluster.evidence) {
      if (!projectIds.has(id)) {
        problems.push(
          `Skill cluster "${cluster.id}" cites unknown project "${id}". ` +
            `Known projects: ${[...projectIds].join(', ')}`,
        )
      }
    }
  }

  const duplicateChecks: [string, readonly string[]][] = [
    ['project', input.projects.map((project) => project.id)],
    ['skill cluster', input.skills.map((cluster) => cluster.id)],
    ['experience', input.experience.map((role) => role.id)],
    ['section', input.sections.map((section) => section.id)],
  ]

  for (const [label, ids] of duplicateChecks) {
    for (const duplicate of findDuplicates(ids)) {
      problems.push(`Duplicate ${label} id: "${duplicate}"`)
    }
  }

  const orders = input.sections.map((section) => String(section.order))
  for (const duplicate of findDuplicates(orders)) {
    problems.push(
      `Two sections share order ${duplicate} — story order would be ambiguous.`,
    )
  }

  return problems
}

const integrityProblems = checkReferentialIntegrity({
  projects,
  skills,
  experience,
  sections,
})

if (integrityProblems.length > 0) {
  throw new Error(
    `Content references are broken:\n${integrityProblems
      .map((problem) => `  - ${problem}`)
      .join('\n')}`,
  )
}

// ---------------------------------------------------------------------------
// Re-exports so consumers have one import site
// ---------------------------------------------------------------------------

export { projectCategoryLabels } from './taxonomy'
export { stopwords, synonyms } from './vocabulary'
export {
  INTENT_IDS,
  contractions,
  intentCues,
  questionWords,
} from './interpretation'
export type { Cue, Cues, IntentId } from './interpretation'
export {
  allTechnologies,
  brandedTechnologies,
  careerStart,
  counts,
  experienceSince,
  featuredSkills,
  technologies,
  visibleSections,
} from './derived'
export {
  LOCALE,
  PRESENT_LABEL,
  formatDuration,
  formatMonth,
  formatRange,
  monthsBetween,
  markWords,
  splitDuration,
  splitName,
} from './format'
export type * from './schema'

import {
  achievements,
  allTechnologies,
  education,
  experience,
  formatRange,
  profile,
  projectCategoryLabels,
  intentCues,
  projects,
  questionWords,
  skills,
  stopwords,
} from '@/content'

import type { Passage } from './types'

/**
 * The content layer, turned into retrievable passages.
 *
 * Built at module load rather than by a build script: the corpus is a few
 * dozen short documents, so indexing costs under a millisecond and a
 * generated artefact would only be another thing to keep in sync.
 *
 * Because this derives from src/content, adding a project makes the
 * assistant able to answer questions about it with no code change at all.
 */

/**
 * Every technology named anywhere — the vocabulary for "do you know X?".
 *
 * Re-exported rather than recomputed: the logo strip needs the same list, and
 * two copies of "everything the CV mentions" is exactly the duplication the
 * content layer exists to prevent (R5).
 */
export const knownTechnologies: readonly string[] = allTechnologies

function buildPassages(): Passage[] {
  const built: Passage[] = []

  built.push({
    id: 'profile:summary',
    kind: 'profile',
    title: profile.name,
    text: `${profile.name} ${profile.role} ${profile.tagline} ${profile.summary} ${profile.location.city} ${profile.location.region} ${profile.location.country}`,
    tags: [profile.role],
    sectionId: 'hero',
  })

  built.push({
    id: 'contact:availability',
    kind: 'contact',
    title: 'Availability and contact',
    text: `${profile.availability.statement} ${profile.email} ${profile.links
      .map((link) => link.label)
      .join(' ')} contact hire email reach`,
    tags: profile.links.map((link) => link.label),
    sectionId: 'contact',
  })

  for (const role of experience) {
    built.push({
      id: `experience:${role.id}`,
      kind: 'experience',
      title: `${role.role}, ${role.org}`,
      text: `${role.role} ${role.org} ${formatRange(role.start, role.end)} ${role.summary} ${role.highlights.join(' ')} ${role.stack.join(' ')}`,
      tags: [role.org, ...role.stack],
      sectionId: 'journey',
      refId: role.id,
    })
  }

  for (const project of projects) {
    built.push({
      id: `project:${project.id}`,
      kind: 'project',
      title: project.name,
      text: `${project.name} ${projectCategoryLabels[project.category]} ${project.problem} ${project.approach} ${project.outcome} ${project.highlights.join(' ')} ${project.stack.join(' ')}`,
      tags: [project.name, ...project.stack],
      sectionId: 'projects',
      refId: project.id,
    })
  }

  for (const cluster of skills) {
    built.push({
      id: `skill:${cluster.id}`,
      kind: 'skill',
      title: cluster.title,
      text: `${cluster.title} ${cluster.blurb} ${cluster.items.join(' ')}`,
      tags: cluster.items,
      sectionId: 'journey',
      refId: cluster.id,
    })
  }

  for (const award of achievements) {
    built.push({
      id: `achievement:${award.id}`,
      kind: 'achievement',
      title: award.title,
      text: `${award.title} ${award.event} ${award.organisation} ${award.year} ${award.detail} competition award placement`,
      tags: [award.event, award.organisation],
      sectionId: 'journey',
      refId: award.id,
    })
  }

  for (const study of education) {
    built.push({
      id: `education:${study.id}`,
      kind: 'education',
      title: study.qualification,
      text: `${study.qualification} ${study.field ?? ''} ${study.institution} ${study.startYear} ${study.endYear} ${study.score.label} ${study.score.value} degree college study`,
      tags: [study.institution],
      sectionId: 'journey',
      refId: study.id,
    })
  }

  return built
}

export const passages: readonly Passage[] = buildPassages()

/**
 * Every word the corpus actually contains, unstemmed.
 *
 * This is the dictionary the spell repairer checks against, which is why it
 * is built from the raw text rather than from the search index: the index
 * stores "compan", and repairing "compnay" to "compan" would be worse than
 * leaving it alone. Question words are folded in so ordinary English asked
 * about the portfolio is never mistaken for a typo.
 */
export const corpusVocabulary: ReadonlySet<string> = new Set(
  [
    ...passages.flatMap((passage) =>
      `${passage.title} ${passage.text} ${passage.tags.join(' ')}`
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, ' ')
        .split(/\s+/)
        // "competition." would otherwise enter the dictionary with its full
        // stop attached, and every clean "competition" would look misspelt.
        .map((word) => word.replace(/^[.\-]+|[.\-]+$/g, '')),
    ),
    ...questionWords,
    ...stopwords,
  ].filter((word) => word !== ''),
)

/**
 * Every word the engine recognises, corpus and router alike.
 *
 * A word in here is never treated as a typo. It is deliberately wider than
 * the repair dictionary above: "competent" and "weakness" are real words the
 * router listens for, but they appear nowhere in the CV, and correcting them
 * toward something that does appear there is worse than useless.
 */
export const recognisedWords: ReadonlySet<string> = new Set([
  ...corpusVocabulary,
  ...Object.values(intentCues).flatMap((cues) =>
    [
      ...(cues.words ?? []),
      ...(cues.prefixes ?? []),
      ...(cues.phrases ?? []),
    ].flatMap(([term]) => term.split(' ')),
  ),
])

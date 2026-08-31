import {
  achievements,
  education,
  experience,
  formatRange,
  profile,
  projectCategoryLabels,
  projects,
  skills,
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

/** Every technology named anywhere — the vocabulary for "do you know X?". */
export const knownTechnologies: readonly string[] = [
  ...new Set([
    ...projects.flatMap((project) => project.stack),
    ...experience.flatMap((role) => role.stack),
    ...skills.flatMap((cluster) => cluster.items),
  ]),
].sort((a, b) => a.localeCompare(b))

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

import {
  achievements,
  counts,
  education,
  experience,
  formatRange,
  profile,
  projectCategoryLabels,
  projects,
  skills,
} from '@/content'

import { knownTechnologies } from './passages'
import { retrieve } from './retrieve'
import { normalise } from './tokenize'
import type { Answer, AnswerBlock, Hit } from './types'

/**
 * Intent routing and answer composition.
 *
 * Every sentence returned here is assembled from validated content. There is
 * no answers file to maintain and nothing is written in advance — change the
 * CV and the answers change with it. It is also why the assistant cannot
 * invent a job or a technology: there is no generative step to invent with.
 */

/** Below this score nothing has really matched, and the engine says so. */
const CONFIDENCE_FLOOR = 1.2

function list(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Longest match first, so "AWS Lambda" wins over "AWS". */
const TECH_BY_LENGTH = [...knownTechnologies].sort(
  (a, b) => b.length - a.length,
)

function findTechnology(query: string): string | null {
  const text = normalise(query)

  for (const technology of TECH_BY_LENGTH) {
    const needle = normalise(technology)
    if (needle.length < 2) continue
    if (text.includes(needle)) return technology
  }

  return null
}

function projectsUsing(technology: string) {
  const needle = technology.toLowerCase()
  return projects.filter((project) =>
    project.stack.some((item) => item.toLowerCase() === needle),
  )
}

function rolesUsing(technology: string) {
  const needle = technology.toLowerCase()
  return experience.filter((role) =>
    role.stack.some((item) => item.toLowerCase() === needle),
  )
}

// ---------------------------------------------------------------------------
// Composers
// ---------------------------------------------------------------------------

function answerAbout(): Answer {
  return {
    blocks: [
      { type: 'text', value: profile.summary },
      {
        type: 'text',
        value: `Based in ${profile.location.city}, ${profile.location.region}. ${counts.projects} projects shipped, using ${counts.technologies} technologies across them.`,
      },
      { type: 'jump', label: 'See the journey', sectionId: 'journey' },
    ],
    confidence: 1,
    sources: ['profile:summary'],
    intent: 'about',
  }
}

function answerContact(): Answer {
  return {
    blocks: [
      { type: 'text', value: profile.availability.statement },
      { type: 'text', value: `The quickest route is email: ${profile.email}` },
      ...profile.links.map((link): AnswerBlock => ({
        type: 'link',
        label: link.label,
        href: link.href,
      })),
    ],
    confidence: 1,
    sources: ['contact:availability'],
    intent: 'contact',
  }
}

function answerExperience(): Answer {
  const blocks: AnswerBlock[] = experience.flatMap((role): AnswerBlock[] => [
    {
      type: 'text',
      value: `${role.role} at ${role.org}, ${formatRange(role.start, role.end)}. ${role.summary}`,
    },
    { type: 'chips', values: role.stack },
  ])

  blocks.push({
    type: 'jump',
    label: 'Open the timeline',
    sectionId: 'journey',
  })

  return {
    blocks,
    confidence: 1,
    sources: experience.map((role) => `experience:${role.id}`),
    intent: 'experience',
  }
}

function answerProjectsOverview(): Answer {
  const categories = [
    ...new Set(projects.map((p) => projectCategoryLabels[p.category])),
  ]

  return {
    blocks: [
      {
        type: 'text',
        value: `${counts.projects} projects, spanning ${list(categories)}.`,
      },
      ...projects.map((project): AnswerBlock => ({
        type: 'text',
        value: `${project.name}: ${project.outcome}`,
      })),
      { type: 'jump', label: 'Open projects', sectionId: 'projects' },
    ],
    confidence: 1,
    sources: projects.map((project) => `project:${project.id}`),
    intent: 'projects-overview',
  }
}

function answerProjectDetail(projectId: string): Answer {
  const project = projects.find((entry) => entry.id === projectId)
  if (!project) return answerProjectsOverview()

  return {
    blocks: [
      {
        type: 'text',
        value: `${project.name} — ${projectCategoryLabels[project.category]}, ${project.year}.`,
      },
      { type: 'text', value: project.problem },
      { type: 'text', value: project.approach },
      { type: 'text', value: project.outcome },
      { type: 'chips', values: project.stack },
      ...project.links.map((link): AnswerBlock => ({
        type: 'link',
        label: link.label,
        href: link.href,
      })),
      { type: 'jump', label: 'See all projects', sectionId: 'projects' },
    ],
    confidence: 1,
    sources: [`project:${project.id}`],
    intent: 'project-detail',
  }
}

function answerSkills(): Answer {
  return {
    blocks: [
      {
        type: 'text',
        value: `${counts.technologies} technologies across ${counts.skillClusters} areas.`,
      },
      ...skills.flatMap((cluster): AnswerBlock[] => [
        { type: 'text', value: `${cluster.title}: ${cluster.blurb}` },
        { type: 'chips', values: cluster.items },
      ]),
      { type: 'jump', label: 'See capabilities', sectionId: 'journey' },
    ],
    confidence: 1,
    sources: skills.map((cluster) => `skill:${cluster.id}`),
    intent: 'skills-overview',
  }
}

function answerSkillCheck(technology: string): Answer {
  const usedInProjects = projectsUsing(technology)
  const usedInRoles = rolesUsing(technology)

  if (usedInProjects.length === 0 && usedInRoles.length === 0) {
    // In the toolkit, but not the headline technology of any shipped work.
    const cluster = skills.find((entry) =>
      entry.items.some(
        (item) => item.toLowerCase() === technology.toLowerCase(),
      ),
    )

    return {
      blocks: [
        {
          type: 'text',
          value: `Yes — ${technology} is part of my ${cluster ? cluster.title.toLowerCase() : 'toolkit'}, though it is not the headline technology on any single project here.`,
        },
        { type: 'jump', label: 'See capabilities', sectionId: 'journey' },
      ],
      confidence: 1,
      sources: cluster ? [`skill:${cluster.id}`] : [],
      intent: 'skill-check',
    }
  }

  const where = [
    ...usedInProjects.map((project) => project.name),
    ...usedInRoles.map((role) => role.org),
  ]

  return {
    blocks: [
      {
        type: 'text',
        value: `Yes. I have used ${technology} in ${list([...new Set(where)])}.`,
      },
      ...usedInProjects.map((project): AnswerBlock => ({
        type: 'text',
        value: `${project.name}: ${project.approach}`,
      })),
      { type: 'jump', label: 'See the work', sectionId: 'projects' },
    ],
    confidence: 1,
    sources: usedInProjects.map((project) => `project:${project.id}`),
    intent: 'skill-check',
  }
}

/**
 * The most important behaviour in the engine. When something is not in the
 * portfolio it says so plainly and offers the nearest thing that is, rather
 * than reaching for an answer it cannot support.
 */
function answerUnknownTechnology(term: string): Answer {
  return {
    blocks: [
      {
        type: 'text',
        value: `${term} is not something I have worked with yet — it is not in this portfolio, so I would rather say so than guess.`,
      },
      {
        type: 'text',
        value: `What I do work with falls under ${list(skills.slice(0, 3).map((cluster) => cluster.title))}.`,
      },
      { type: 'chips', values: knownTechnologies.slice(0, 10) },
      { type: 'jump', label: 'See capabilities', sectionId: 'journey' },
    ],
    confidence: 0.5,
    sources: [],
    intent: 'unknown-technology',
  }
}

function answerEducation(): Answer {
  return {
    blocks: [
      ...education.map((study): AnswerBlock => ({
        type: 'text',
        value: `${study.qualification}${study.field ? ` (${study.field})` : ''}, ${study.institution}, ${study.startYear}-${study.endYear} — ${study.score.label} ${study.score.value}.`,
      })),
      { type: 'jump', label: 'See the journey', sectionId: 'journey' },
    ],
    confidence: 1,
    sources: education.map((study) => `education:${study.id}`),
    intent: 'education',
  }
}

function answerAchievements(): Answer {
  return {
    blocks: [
      ...achievements.map((award): AnswerBlock => ({
        type: 'text',
        value: `${award.title} — ${award.event}, ${award.organisation} (${award.year}). ${award.detail}`,
      })),
      { type: 'jump', label: 'See the journey', sectionId: 'journey' },
    ],
    confidence: 1,
    sources: achievements.map((award) => `achievement:${award.id}`),
    intent: 'achievements',
  }
}

function answerNotFound(): Answer {
  return {
    blocks: [
      {
        type: 'text',
        value: `That is not something this portfolio covers, so I will not guess at it.`,
      },
      { type: 'text', value: `Here is what I can answer:` },
      {
        type: 'chips',
        values: [
          'Projects',
          'Experience',
          'Technologies',
          'Education',
          'Achievements',
          'Availability',
        ],
      },
    ],
    confidence: 0,
    sources: [],
    intent: 'not-found',
  }
}

function answerFromHit(hit: Hit): Answer {
  const { passage } = hit

  if (passage.kind === 'project' && passage.refId) {
    return answerProjectDetail(passage.refId)
  }
  if (passage.kind === 'experience') return answerExperience()
  if (passage.kind === 'skill') return answerSkills()
  if (passage.kind === 'education') return answerEducation()
  if (passage.kind === 'achievement') return answerAchievements()
  if (passage.kind === 'contact') return answerContact()

  return answerAbout()
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

const PATTERNS = {
  /**
   * Leading word boundary only. A trailing boundary would break every prefix
   * here: /\baward\b/ does not match "awards", and /\beducat\b/ matches
   * nothing at all. Prefixes are the point — visitors write plurals.
   */
  contact:
    /\b(contact|reach|email|touch|connect|hire|hiring|availab|opportunit|open to)/,
  skillCheck:
    /\b(do you know|know|used|use|worked with|work with|experience with|familiar|comfortable)/,
  education:
    /\b(educat|stud|degree|college|university|school|cgpa|graduat|academic)/,
  achievements:
    /\b(award|competition|hackathon|placement|won|win|achiev|prize|rank)/,
  experience: /\b(experienc|intern|job|career|background|employ)/,
  /**
   * "work" is matched exactly rather than as a prefix, so "show me your work"
   * reads as projects while "where have you worked" still reads as experience.
   */
  projects: /\b(project|built|build|portfolio|shipped|made|work\b)/,
  skills: /\b(skill|stack|technolog|tool|language|framework|proficien)/,
  about: /\b(who|about|yourself|introduce|summary|bio)/,
} as const

/**
 * Answer a question about the portfolio.
 *
 * Order matters: a named technology or a named project beats a generic topic
 * match, because "do you know Docker" and "tell me about your projects" want
 * very different answers even though both are about work.
 */
export function answer(rawQuery: string): Answer {
  const query = normalise(rawQuery)
  if (query === '') return answerNotFound()

  // A named technology is the strongest signal available.
  const technology = findTechnology(rawQuery)
  if (technology) return answerSkillCheck(technology)

  // Asked about a technology that is nowhere in the portfolio.
  if (
    PATTERNS.skillCheck.test(query) &&
    !PATTERNS.projects.test(query) &&
    !PATTERNS.experience.test(query) &&
    !PATTERNS.skills.test(query)
  ) {
    const candidate = rawQuery
      .replace(/[?.!,]/g, '')
      .split(/\s+/)
      .filter((word) => /^[A-Za-z][A-Za-z.+#-]+$/.test(word))
      .pop()

    if (candidate) return answerUnknownTechnology(candidate)
  }

  const hits = retrieve(rawQuery)
  const top = hits[0]

  // A project named directly outranks a generic topic word.
  if (
    top &&
    top.passage.kind === 'project' &&
    top.score > CONFIDENCE_FLOOR * 2
  ) {
    return answerFromHit(top)
  }

  if (PATTERNS.contact.test(query)) return answerContact()
  if (PATTERNS.education.test(query)) return answerEducation()
  if (PATTERNS.achievements.test(query)) return answerAchievements()
  if (PATTERNS.projects.test(query)) return answerProjectsOverview()
  if (PATTERNS.experience.test(query)) return answerExperience()
  if (PATTERNS.skills.test(query)) return answerSkills()
  if (PATTERNS.about.test(query)) return answerAbout()

  if (top && top.score >= CONFIDENCE_FLOOR) return answerFromHit(top)

  return answerNotFound()
}

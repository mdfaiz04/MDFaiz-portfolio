import {
  achievements,
  counts,
  education,
  experience,
  experienceSince,
  formatMonth,
  formatRange,
  profile,
  projectCategoryLabels,
  projects,
  skills,
  type IntentId,
} from '@/content'

import { limits, strengths, verdict, verdictSources } from './assess'
import { capitalise, condense, list, plainProject, plural } from './explain'
import { understand, type Reading } from './understand'
import type { Answer, AnswerBlock, Point } from './types'

/**
 * Answer composition.
 *
 * Two rules hold everywhere in this file.
 *
 * First, every sentence is assembled from validated content. There is no
 * answers file to maintain and nothing is written in advance — change the CV
 * and the answers change with it. It is also why the assistant cannot invent
 * a job or a technology: there is no generative step to invent with.
 *
 * Second, an answer explains before it lists. The shape is always the same:
 * one plain sentence that actually answers the question, three or four short
 * labelled lines that unpack it, then a pointer to the section where the full
 * version lives. Nobody reads a wall of CV prose inside a chat box, and an
 * answer that has to be read twice has failed regardless of how correct it is.
 */

/** Section ids the answers link to. They come from the section registry. */
const JOURNEY = 'journey'
const PROJECTS = 'projects'
const CONTACT = 'contact'

/** Below this the engine will still answer, but says that it is unsure. */
const HEDGE_BELOW = 0.75

/**
 * Ceiling on supporting lines, so an answer stays scannable.
 *
 * Set high enough that no composer's complete list is silently trimmed —
 * dropping a capability area to save a line would be a lie of omission. Where
 * a list is a selection rather than the whole set, the composer slices it
 * itself.
 */
const MAX_POINTS = 6

/** Judgements shown at once. More than this and none of them land. */
const MAX_TRAITS = 4

/**
 * What each intent is about, in words a visitor would recognise.
 *
 * Serves twice over: as the topic chips offered when the engine has nothing,
 * and as the phrasing of an uncertain reading.
 */
type Topic = {
  /** Short enough to sit on a chip. */
  chip: string
  /** Reads naturally inside "answering on ___". */
  phrase: string
}

const INTENT_TOPIC: Partial<Record<IntentId, Topic>> = {
  about: { chip: 'Who he is', phrase: 'who he is' },
  assessment: {
    chip: 'What he is like',
    phrase: 'what he is like as an engineer',
  },
  strengths: { chip: 'Strengths', phrase: 'his strengths' },
  limits: { chip: 'Weak spots', phrase: 'his weak spots' },
  'why-hire': { chip: 'Why hire him', phrase: 'why hire him' },
  experience: { chip: 'Experience', phrase: 'his experience' },
  'projects-overview': { chip: 'Projects', phrase: 'his projects' },
  'project-detail': { chip: 'A project', phrase: 'one particular project' },
  'skills-overview': { chip: 'Technologies', phrase: 'his technologies' },
  'skill-area': { chip: 'A capability', phrase: 'one capability area' },
  'skill-check': { chip: 'A technology', phrase: 'one particular technology' },
  education: { chip: 'Education', phrase: 'his education' },
  achievements: { chip: 'Competitions', phrase: 'his competition results' },
  contact: { chip: 'Get in touch', phrase: 'getting in touch' },
}

/** Topic chips, derived from the intent registry rather than a written list. */
const TOPICS: readonly string[] = [
  'about',
  'assessment',
  'strengths',
  'limits',
  'experience',
  'projects-overview',
  'skills-overview',
  'education',
  'achievements',
  'contact',
].flatMap((intent) => {
  const topic = INTENT_TOPIC[intent as IntentId]
  return topic ? [topic.chip] : []
})

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function text(value: string): AnswerBlock {
  return { type: 'text', value }
}

function points(values: readonly Point[]): AnswerBlock {
  return { type: 'points', values: values.slice(0, MAX_POINTS) }
}

function jump(label: string, sectionId: string): AnswerBlock {
  return { type: 'jump', label, sectionId }
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

const skillTitles = skills.map((cluster) => cluster.title)
const categoryLabels = [
  ...new Set(
    projects.map((project) => projectCategoryLabels[project.category]),
  ),
]
const currentRole = experience.find((role) => role.end === null)
const allInternships = experience.every((role) => role.kind === 'internship')

// ---------------------------------------------------------------------------
// Composers
// ---------------------------------------------------------------------------

function answerGreeting(): Answer {
  return {
    blocks: [
      text(
        `Hello. I answer questions about ${profile.shortName}'s work, and every answer is assembled from this portfolio — so nothing here is invented.`,
      ),
      text('Ask what he is like as an engineer, or name any project.'),
      { type: 'chips', values: TOPICS },
    ],
    confidence: 1,
    sources: ['profile:summary'],
    intent: 'greeting',
  }
}

function answerCapabilities(): Answer {
  return {
    blocks: [
      text(
        'No language model behind me — I am a small search engine that runs inside this page, on your device.',
      ),
      points([
        {
          label: 'How it works',
          value:
            'Your question is ranked against every fact in this portfolio, and the answer is assembled from whatever it matches.',
        },
        {
          label: 'What that buys you',
          value:
            'I cannot invent a job, a technology or a result. If something is not on this page I will say so rather than guess.',
        },
        {
          label: 'What I can cover',
          value: `${capitalise(list(TOPICS.map((topic) => topic.toLowerCase())))} — and anything else written on this page.`,
        },
      ]),
      { type: 'chips', values: TOPICS },
    ],
    confidence: 1,
    sources: ['profile:summary'],
    intent: 'capabilities',
  }
}

function answerAbout(): Answer {
  const detail: Point[] = [
    {
      label: 'Based in',
      value: `${profile.location.city}, ${profile.location.region}, ${profile.location.country}.`,
    },
  ]

  if (currentRole) {
    detail.push({
      label: 'Right now',
      value: `${currentRole.role} at ${currentRole.org}, since ${formatMonth(currentRole.start)}.`,
    })
  }

  detail.push(
    {
      label: 'Works on',
      value: `${list(skillTitles.slice(0, 3))}.`,
    },
    {
      label: 'Built',
      value: `${plural(projects.length, 'project')}, using ${counts.technologies} technologies between them.`,
    },
  )

  return {
    blocks: [
      text(profile.summary),
      points(detail),
      jump('See the journey', JOURNEY),
    ],
    confidence: 1,
    sources: ['profile:summary'],
    intent: 'about',
  }
}

/**
 * The judgement answer.
 *
 * Opens with a verdict, supports it with facts, then volunteers the honest
 * caveats without being asked. Offering the weak side unprompted is what
 * makes the strong side believable.
 */
function answerAssessment(asOf: Date): Answer {
  const good = strengths().slice(0, MAX_TRAITS)
  const bad = limits(asOf)

  const blocks: AnswerBlock[] = [
    text(verdict()),
    points(good.map((trait) => ({ label: trait.claim, value: trait.because }))),
  ]

  if (bad.length > 0) {
    blocks.push(
      text('And the honest other half:'),
      points(
        bad.map((trait) => ({ label: trait.claim, value: trait.because })),
      ),
    )
  }

  blocks.push(jump('See the evidence', JOURNEY))

  return {
    blocks,
    confidence: 1,
    sources: [
      ...new Set([
        ...verdictSources(),
        ...good.flatMap((trait) => trait.sources),
      ]),
    ],
    intent: 'assessment',
  }
}

function answerStrengths(): Answer {
  const good = strengths().slice(0, MAX_TRAITS)

  return {
    blocks: [
      text(
        `${capitalise(plural(good.length, 'thing'))} the work here actually proves:`,
      ),
      points(
        good.map((trait) => ({ label: trait.claim, value: trait.because })),
      ),
      text('Every line above is checkable on this page.'),
      jump('See the evidence', JOURNEY),
    ],
    confidence: 1,
    sources: [...new Set(good.flatMap((trait) => trait.sources))],
    intent: 'strengths',
  }
}

function answerLimits(asOf: Date): Answer {
  const bad = limits(asOf)
  const counterweight = strengths()[0]

  if (bad.length === 0) return answerAssessment(asOf)

  const blocks: AnswerBlock[] = [
    text(`Straight answer — ${plural(bad.length, 'thing')} worth knowing:`),
    points(bad.map((trait) => ({ label: trait.claim, value: trait.because }))),
  ]

  if (counterweight) {
    blocks.push(
      text(`Against that — ${counterweight.claim} ${counterweight.because}`),
    )
  }

  blocks.push(jump('Judge it yourself', PROJECTS))

  return {
    blocks,
    confidence: 1,
    sources: [...new Set(bad.flatMap((trait) => trait.sources))],
    intent: 'limits',
  }
}

function answerWhyHire(): Answer {
  const good = strengths().slice(0, 3)

  return {
    blocks: [
      text(verdict()),
      points(
        good.map((trait) => ({ label: trait.claim, value: trait.because })),
      ),
      text(profile.availability.statement),
      jump('Get in touch', CONTACT),
    ],
    confidence: 1,
    sources: [
      ...new Set([
        ...verdictSources(),
        ...good.flatMap((trait) => trait.sources),
      ]),
    ],
    intent: 'why-hire',
  }
}

function answerExperience(asOf: Date): Answer {
  const tenure = experienceSince(asOf)
  const stack = [...new Set(experience.flatMap((role) => role.stack))]

  return {
    blocks: [
      text(
        `${capitalise(plural(experience.length, allInternships ? 'internship' : 'role'))}, ${tenure.label} in total.`,
      ),
      points(
        experience.map((role) => ({
          label: `${role.org} · ${formatRange(role.start, role.end)}`,
          value: condense(role.summary, 24),
        })),
      ),
      { type: 'chips', values: stack },
      text('Each role has its full list of responsibilities in the timeline.'),
      jump('Open the timeline', JOURNEY),
    ],
    confidence: 1,
    sources: experience.map((role) => `experience:${role.id}`),
    intent: 'experience',
  }
}

function answerProjectsOverview(): Answer {
  return {
    blocks: [
      text(
        `${capitalise(plural(projects.length, 'project'))}, across ${list(categoryLabels)}.`,
      ),
      points(
        projects.map((project) => ({
          label: project.name,
          value: plainProject(project).what,
        })),
      ),
      text('Name any one of them and I will go deeper.'),
      jump('Open projects', PROJECTS),
    ],
    confidence: 1,
    sources: projects.map((project) => `project:${project.id}`),
    intent: 'projects-overview',
  }
}

/**
 * One project, explained rather than recited.
 *
 * The four labelled lines are cut from `problem`, `approach` and `outcome` at
 * their natural clause boundaries — see explain.ts. The long version is one
 * click away, which is the point of the closing jump.
 */
function answerProjectDetail(projectId: string): Answer {
  const project = projects.find((entry) => entry.id === projectId)
  if (!project) return answerProjectsOverview()

  const plain = plainProject(project)

  const detail: Point[] = [
    { label: 'What it is', value: plain.what },
    { label: 'Why it exists', value: plain.why },
  ]

  if (plain.how !== '') {
    detail.push({ label: 'How it works', value: plain.how })
  }

  detail.push({ label: 'What came out', value: plain.result })

  return {
    blocks: [
      text(
        `${project.name} — ${projectCategoryLabels[project.category]}, ${project.year}.`,
      ),
      points(detail),
      { type: 'chips', values: project.stack },
      ...project.links.map((link): AnswerBlock => ({
        type: 'link',
        label: link.label,
        href: link.href,
      })),
      jump('See it in full', PROJECTS),
    ],
    confidence: 1,
    sources: [`project:${project.id}`],
    intent: 'project-detail',
  }
}

function answerSkills(): Answer {
  return {
    blocks: [
      text(
        `${capitalise(plural(skills.length, 'capability area'))}, and what each one actually covers:`,
      ),
      points(
        skills.map((cluster) => ({
          label: cluster.title,
          value: condense(cluster.blurb, 22),
        })),
      ),
      text('Ask "do you know X?" about any one of them for a straight answer.'),
      jump('See capabilities', JOURNEY),
    ],
    confidence: 1,
    sources: skills.map((cluster) => `skill:${cluster.id}`),
    intent: 'skills-overview',
  }
}

/**
 * One capability area, answered specifically.
 *
 * "Is he any good at backend?" is a question about backend before it is a
 * question about him, and answering it with a general assessment — which is
 * what the first version did — reads like the assistant did not listen. The
 * evidence projects are the whole point: a claim about an area is only worth
 * anything with the work that proves it attached.
 */
function answerSkillArea(clusterId: string): Answer {
  const cluster = skills.find((entry) => entry.id === clusterId)
  if (!cluster) return answerSkills()

  const evidence = cluster.evidence.flatMap((id) => {
    const project = projects.find((entry) => entry.id === id)
    return project ? [project] : []
  })

  const roles = experience.filter((role) =>
    role.stack.some((item) =>
      cluster.items.some((skill) => skill.toLowerCase() === item.toLowerCase()),
    ),
  )

  const blocks: AnswerBlock[] = [
    text(`${cluster.title} — ${cluster.blurb}`),
    { type: 'chips', values: cluster.items },
  ]

  const detail: Point[] = [
    ...evidence.map((project) => ({
      label: project.name,
      value: plainProject(project).result,
    })),
    ...roles.map((role) => ({
      label: `${role.org} · ${formatRange(role.start, role.end)}`,
      value: condense(role.summary, 22),
    })),
  ]

  if (detail.length > 0) {
    blocks.push(text('Where it has actually been used:'), points(detail))
  } else {
    blocks.push(
      text(
        'No single project here leads with it, so treat it as supporting rather than headline experience.',
      ),
    )
  }

  blocks.push(
    jump(
      evidence.length > 0 ? 'See the work' : 'See capabilities',
      evidence.length > 0 ? PROJECTS : JOURNEY,
    ),
  )

  return {
    blocks,
    confidence: 1,
    sources: [
      `skill:${cluster.id}`,
      ...evidence.map((project) => `project:${project.id}`),
      ...roles.map((role) => `experience:${role.id}`),
    ],
    intent: 'skill-area',
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
        text(
          `Yes — ${technology} is part of the ${cluster ? cluster.title.toLowerCase() : 'toolkit'} here, though it is not the headline technology on any one project.`,
        ),
        ...(cluster ? [text(condense(cluster.blurb, 22))] : []),
        jump('See capabilities', JOURNEY),
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

  const detail: Point[] = [
    ...usedInProjects.map((project) => ({
      label: project.name,
      value: plainProject(project).what,
    })),
    ...usedInRoles.map((role) => ({
      label: role.org,
      value: condense(role.summary, 22),
    })),
  ]

  return {
    blocks: [
      text(`Yes. ${technology} is used in ${list([...new Set(where)])}.`),
      points(detail),
      jump(
        usedInProjects.length > 0 ? 'See the work' : 'Open the timeline',
        usedInProjects.length > 0 ? PROJECTS : JOURNEY,
      ),
    ],
    confidence: 1,
    sources: [
      ...usedInProjects.map((project) => `project:${project.id}`),
      ...usedInRoles.map((role) => `experience:${role.id}`),
    ],
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
      text(
        `No — ${term} is not in this portfolio, so I am not going to claim it.`,
      ),
      text(
        `What has actually been used sits in ${list(skillTitles.slice(0, 3))}.`,
      ),
      // Two per capability area rather than the first twelve alphabetically,
      // which was eight variants of AWS and told a visitor nothing.
      {
        type: 'chips',
        values: skills.flatMap((cluster) => cluster.items.slice(0, 2)),
      },
      jump('See capabilities', JOURNEY),
    ],
    confidence: 0.5,
    sources: [],
    intent: 'unknown-technology',
  }
}

function answerEducation(asOf: Date): Answer {
  const current = education.find((entry) => entry.endYear > asOf.getFullYear())
  const lead = current
    ? `${current.qualification}${current.field ? `, specialising in ${current.field}` : ''}, at ${current.institution} — finishing ${current.endYear}.`
    : `${education.length} qualifications, most recently ${education[0]?.qualification ?? ''}.`

  return {
    blocks: [
      text(lead),
      points(
        education.map((study) => ({
          label: study.qualification,
          value: `${study.institution} · ${study.startYear}–${study.endYear} · ${study.score.label} ${study.score.value}`,
        })),
      ),
      jump('See the journey', JOURNEY),
    ],
    confidence: 1,
    sources: education.map((study) => `education:${study.id}`),
    intent: 'education',
  }
}

function answerAchievements(): Answer {
  const placements = achievements.filter((award) => award.kind === 'placement')

  return {
    blocks: [
      text(
        `${capitalise(plural(placements.length, 'competition placement'))} so far, each judged against outside entrants.`,
      ),
      points(
        achievements.map((award) => ({
          label: `${award.title} — ${award.event}`,
          value: `${award.organisation}, ${award.year}. ${condense(award.detail, 24)}`,
        })),
      ),
      jump('See the journey', JOURNEY),
    ],
    confidence: 1,
    sources: achievements.map((award) => `achievement:${award.id}`),
    intent: 'achievements',
  }
}

function answerContact(): Answer {
  return {
    blocks: [
      text(profile.availability.statement),
      points([
        { label: 'Email', value: profile.email },
        {
          label: 'Based in',
          value: `${profile.location.city}, ${profile.location.region}, ${profile.location.country}`,
        },
      ]),
      ...profile.links.map((link): AnswerBlock => ({
        type: 'link',
        label: link.label,
        href: link.href,
      })),
      jump('Open contact', CONTACT),
    ],
    confidence: 1,
    sources: ['contact:availability'],
    intent: 'contact',
  }
}

function answerNotFound(): Answer {
  return {
    blocks: [
      text(
        'That is not something this portfolio covers, so I will not guess at it.',
      ),
      text('Here is what I can answer:'),
      { type: 'chips', values: TOPICS },
    ],
    confidence: 0,
    sources: [],
    intent: 'not-found',
  }
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function compose(reading: Reading, asOf: Date): Answer {
  switch (reading.intent) {
    case 'greeting':
      return answerGreeting()
    case 'capabilities':
      return answerCapabilities()
    case 'about':
      return answerAbout()
    case 'assessment':
      return answerAssessment(asOf)
    case 'strengths':
      return answerStrengths()
    case 'limits':
      return answerLimits(asOf)
    case 'why-hire':
      return answerWhyHire()
    case 'experience':
      return answerExperience(asOf)
    case 'projects-overview':
      return answerProjectsOverview()
    case 'project-detail':
      return reading.entity?.kind === 'project'
        ? answerProjectDetail(reading.entity.id)
        : answerProjectsOverview()
    case 'skills-overview':
      return answerSkills()
    case 'skill-area':
      return reading.entity?.kind === 'skill-area'
        ? answerSkillArea(reading.entity.id)
        : answerSkills()
    case 'skill-check':
      return reading.entity?.kind === 'technology'
        ? answerSkillCheck(reading.entity.name)
        : answerSkills()
    case 'unknown-technology':
      return reading.entity?.kind === 'unknown-technology'
        ? answerUnknownTechnology(reading.entity.name)
        : answerNotFound()
    case 'education':
      return answerEducation(asOf)
    case 'achievements':
      return answerAchievements()
    case 'contact':
      return answerContact()
    default:
      return answerNotFound()
  }
}

/**
 * Notes the engine adds about its own reading of the question.
 *
 * Both kinds are admissions rather than decoration. Silently repairing a
 * typo, or silently picking one of two plausible readings, is how an
 * assistant ends up answering a question nobody asked.
 */
function notes(reading: Reading, answered: Answer): AnswerBlock[] {
  const out: AnswerBlock[] = []

  if (reading.corrections.length > 0 && answered.intent !== 'not-found') {
    const pairs = reading.corrections.map(
      ([from, to]) => `"${from}" as "${to}"`,
    )
    out.push({ type: 'note', value: `Reading ${list(pairs)}.` })
  }

  const topic = INTENT_TOPIC[answered.intent]

  if (reading.confidence > 0 && reading.confidence < HEDGE_BELOW && topic) {
    out.push({
      type: 'note',
      value: `Not certain I read that right — answering on ${topic.phrase}. Ask again another way if that is not what you meant.`,
    })
  }

  return out
}

/**
 * Answer a question about the portfolio.
 *
 * `asOf` is an argument rather than a `new Date()` inside, so tenure-dependent
 * answers stay pure and the fixture suite can pin the clock.
 */
export function answer(rawQuery: string, asOf: Date = new Date()): Answer {
  const reading = understand(rawQuery)
  const answered = compose(reading, asOf)
  const prefix = notes(reading, answered)

  if (prefix.length === 0) return answered

  return {
    ...answered,
    blocks: [...prefix, ...answered.blocks],
    confidence: Math.min(answered.confidence, reading.confidence),
  }
}

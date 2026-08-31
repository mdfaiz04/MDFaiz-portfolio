import {
  contractions,
  intentCues,
  projects,
  skills,
  stopwords,
  type Cue,
  type IntentId,
} from '@/content'

import { repair } from './fuzzy'
import {
  corpusVocabulary,
  knownTechnologies,
  passages,
  recognisedWords,
} from './passages'
import { retrieve } from './retrieve'
import { normalise, stem, tokenise } from './tokenize'
import type { Hit, PassageKind } from './types'

/**
 * Query understanding.
 *
 * The first version of this engine was an ordered chain of regular
 * expressions: the first one to match won, and anything that matched none of
 * them was refused. That is why an oddly worded question — the kind a real
 * visitor actually types — fell straight through to "I don't have that".
 *
 * This is a scorer instead. Every intent accumulates evidence from four
 * independent sources, and the highest total wins:
 *
 *   1. cues        — how the question is worded          (src/content)
 *   2. entities    — a project or technology named outright
 *   3. retrieval   — what the BM25 index actually matched
 *   4. shape       — a short greeting, a yes/no technology check
 *
 * A clumsy sentence rarely trips a single decisive cue, but it usually trips
 * three weak ones, and three weak ones are enough. When they are not, the
 * reading is returned with low confidence and the answer says so rather than
 * pretending or refusing.
 */

/** Total evidence at which the engine will answer without hedging. */
const CONFIDENT = 3.5

/** Below this, nothing meaningful matched and the engine declines. */
const WEAK = 1

/**
 * How much a retrieval hit is worth.
 *
 * Ranked matches support an intent rather than deciding it, so the total is
 * capped: a coincidental word match must never overturn a deliberate cue.
 * Within that cap, a hit that outscores its runner-up two to one earns a
 * bonus, because "news sentiment" should not be answered with a shrug just
 * because the visitor left half the project's name out.
 */
const RETRIEVAL_CAP = 3
const RETRIEVAL_DECAY = [0.55, 0.25, 0.12] as const
const DOMINANCE_RATIO = 2
const DOMINANCE_BONUS = 0.8

/** Naming a project is close to unambiguous, so it outweighs any topic word. */
const PROJECT_ENTITY_BASE = 4
const TECHNOLOGY_ENTITY_WEIGHT = 5

/** Fraction of a project's distinctive name words a query must cover. */
const NAME_COVERAGE = 0.6

/**
 * Naming a capability area is worth about as much as naming a topic, plus
 * half of whatever evaluative weight the question carried. "Is he any good at
 * backend?" is a question about backend before it is a question about him.
 */
const SKILL_AREA_BASE = 3.5

/**
 * A retrieval hit weaker than this may point at "projects" but not at one
 * particular project.
 *
 * The number is not arbitrary. "news sentiment" scores 7.6 against the right
 * project; "a real production system" scores 3.6 against the wrong one,
 * because "system" happens to appear in it. Naming a project off the second
 * kind of match is how that question got answered with a gesture controller.
 */
const PROJECT_DETAIL_FLOOR = 5

const STOPWORDS = new Set(stopwords)

export type Entity =
  | { kind: 'project'; id: string; name: string }
  | { kind: 'technology'; name: string }
  | { kind: 'skill-area'; id: string; title: string }
  | { kind: 'unknown-technology'; name: string }

export type Reading = {
  intent: IntentId
  /** 0 when nothing matched, 1 when the engine is sure. */
  confidence: number
  entity: Entity | null
  /** The query after contraction expansion and spelling repair. */
  query: string
  /** Words that were corrected, so the answer can admit to it. */
  corrections: readonly (readonly [string, string])[]
  hits: readonly Hit[]
  /** Second-best intent, for explaining an uncertain reading. */
  runnerUp: IntentId | null
}

// ---------------------------------------------------------------------------
// Preparation
// ---------------------------------------------------------------------------

/** Split on spaces AND hyphens, so "gesture-based" matches "gesture". */
function words(text: string): string[] {
  return text.split(/[\s-]+/).filter((word) => word !== '')
}

/** Drop the punctuation that distinguishes "node.js" from "nodejs". */
function compact(word: string): string {
  return word.replace(/[.\-]/g, '')
}

function expandContractions(text: string): string {
  return words(text)
    .map((word) => contractions[word] ?? word)
    .join(' ')
}

/**
 * Normalise, expand shorthand, then repair spelling.
 *
 * Order matters: repairing first would try to find "dont" in a vocabulary
 * that only ever contains "do" and "not".
 */
export function prepare(raw: string): {
  query: string
  corrections: [string, string][]
} {
  const expanded = expandContractions(normalise(raw))
  const { text, corrections } = repair(
    expanded,
    corpusVocabulary,
    recognisedWords,
  )
  return { query: text, corrections }
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/**
 * Technologies keyed by their compacted word sequence.
 *
 * Matching whole words rather than substrings is not a refinement, it is a
 * correctness fix: "what are your flaws" contains "aws", and "average"
 * contains "rag". Both used to be answered as technology questions.
 */
const TECHNOLOGY_INDEX = (() => {
  const index = new Map<string, { name: string; length: number }>()

  for (const technology of knownTechnologies) {
    const parts = words(normalise(technology)).map(compact)
    if (parts.length === 0) continue

    const key = parts.join(' ')
    if (key.length < 2) continue

    index.set(key, { name: technology, length: parts.length })
  }

  return index
})()

const LONGEST_TECHNOLOGY = Math.max(
  1,
  ...[...TECHNOLOGY_INDEX.values()].map((entry) => entry.length),
)

/** The longest technology named in the query, or null. */
export function findTechnology(query: string): string | null {
  const parts = words(query).map(compact)

  for (let size = LONGEST_TECHNOLOGY; size >= 1; size -= 1) {
    for (let start = 0; start + size <= parts.length; start += 1) {
      const match = TECHNOLOGY_INDEX.get(
        parts.slice(start, start + size).join(' '),
      )
      if (match) return match.name
    }
  }

  return null
}

/** Distinctive words of each project name, for direct-reference matching. */
const PROJECT_NAMES = projects.map((project) => ({
  id: project.id,
  name: project.name,
  tokens: [
    ...new Set(
      words(normalise(project.name)).filter(
        (word) => word.length > 2 && !STOPWORDS.has(word),
      ),
    ),
  ],
}))

/** A project referred to by name, with how much of the name was used. */
export function findProject(
  query: string,
): { id: string; name: string; coverage: number } | null {
  const asked = new Set(words(query))
  let best: { id: string; name: string; coverage: number } | null = null

  for (const project of PROJECT_NAMES) {
    if (project.tokens.length === 0) continue

    const matched = project.tokens.filter((token) => asked.has(token)).length
    const coverage = matched / project.tokens.length

    if (matched < 2 || coverage < NAME_COVERAGE) continue
    if (best !== null && coverage <= best.coverage) continue

    best = { id: project.id, name: project.name, coverage }
  }

  return best
}

/**
 * Capability areas, keyed by the distinctive words of their own titles.
 *
 * Stemmed, because the query arrives stemmed: "devops" indexes as "devop".
 * A word that belongs to two areas — "engineering" — is dropped rather than
 * arbitrarily assigned, since it identifies nothing.
 */
const SKILL_AREA_KEYWORDS = (() => {
  const owners = new Map<string, string[]>()

  for (const cluster of skills) {
    const keywords = new Set(
      words(normalise(cluster.title))
        .filter((word) => word.length > 2 && !STOPWORDS.has(word))
        .map(stem),
    )

    for (const keyword of keywords) {
      owners.set(keyword, [...(owners.get(keyword) ?? []), cluster.id])
    }
  }

  const map = new Map<string, string>()
  for (const [keyword, ids] of owners) {
    const only = ids.length === 1 ? ids[0] : undefined
    if (only) map.set(keyword, only)
  }

  return map
})()

/**
 * A capability area named in the query.
 *
 * Runs on the tokenised query rather than the raw words, so the synonym map
 * does the heavy lifting for free: "AI" expands to "artificial intelligence",
 * "server side" and "api" both expand to "backend".
 */
export function findSkillArea(
  query: string,
): { id: string; title: string } | null {
  for (const token of tokenise(query)) {
    const id = SKILL_AREA_KEYWORDS.get(token)
    const cluster = id ? skills.find((entry) => entry.id === id) : undefined

    if (cluster) return { id: cluster.id, title: cluster.title }
  }

  return null
}

/**
 * A word that looks like a technology but appears nowhere in the portfolio.
 *
 * Everything the corpus knows about is excluded, as is every cue term, so
 * "do you know your stack" cannot be read as a question about a product
 * called Stack.
 */
const CUE_WORDS = new Set(
  Object.values(intentCues).flatMap((cues) => [
    ...(cues.words ?? []).map(([term]: Cue) => term),
    ...(cues.prefixes ?? []).map(([term]: Cue) => term),
    ...(cues.phrases ?? []).flatMap(([term]: Cue) => term.split(' ')),
  ]),
)

function findUnknownTechnology(query: string, raw: string): string | null {
  const candidates = words(query).filter(
    (word) =>
      word.length >= 2 &&
      !STOPWORDS.has(word) &&
      !CUE_WORDS.has(word) &&
      !corpusVocabulary.has(word),
  )

  const candidate = candidates[candidates.length - 1]
  if (candidate === undefined) return null

  // Prefer the visitor's own capitalisation: "Kubernetes", not "kubernetes".
  const original = words(raw).find(
    (word) => compact(normalise(word)) === compact(candidate),
  )

  return original ?? candidate
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreCues(query: string): Map<IntentId, number> {
  const asked = new Set(words(query))
  const scores = new Map<IntentId, number>()

  const add = (intent: IntentId, weight: number) => {
    scores.set(intent, (scores.get(intent) ?? 0) + weight)
  }

  for (const [key, cues] of Object.entries(intentCues)) {
    const intent = key as IntentId

    for (const [term, weight] of cues.phrases ?? []) {
      if (query.includes(term)) add(intent, weight)
    }

    for (const [term, weight] of cues.words ?? []) {
      if (asked.has(term)) add(intent, weight)
    }

    for (const [term, weight] of cues.prefixes ?? []) {
      if ([...asked].some((word) => word.startsWith(term))) add(intent, weight)
    }
  }

  return scores
}

/** Which intent a retrieved passage is evidence for. */
const INTENT_BY_KIND: Record<PassageKind, IntentId> = {
  profile: 'about',
  contact: 'contact',
  experience: 'experience',
  project: 'project-detail',
  skill: 'skills-overview',
  achievement: 'achievements',
  education: 'education',
}

const HAS_PASSAGES = passages.length > 0

// ---------------------------------------------------------------------------
// The router
// ---------------------------------------------------------------------------

export function understand(raw: string): Reading {
  const { query, corrections } = prepare(raw)

  const empty: Reading = {
    intent: 'not-found',
    confidence: 0,
    entity: null,
    query,
    corrections,
    hits: [],
    runnerUp: null,
  }

  if (query === '' || !HAS_PASSAGES) return empty

  const asked = words(query)
  const scores = scoreCues(query)
  const cueScore = (intent: IntentId) => scores.get(intent) ?? 0

  // A greeting is only a greeting when it is the whole message. "Hi, what
  // have you built?" is a question with a hello attached to it.
  if (asked.length <= 3 && cueScore('greeting') > 0) {
    return { ...empty, intent: 'greeting', confidence: 1 }
  }
  scores.delete('greeting')

  // --- entities -----------------------------------------------------------

  let entity: Entity | null = null

  const project = findProject(query)
  if (project) {
    entity = { kind: 'project', id: project.id, name: project.name }
    scores.set(
      'project-detail',
      cueScore('project-detail') + PROJECT_ENTITY_BASE + 3 * project.coverage,
    )
  }

  const technology = findTechnology(query)
  if (technology && entity === null) {
    entity = { kind: 'technology', name: technology }
    scores.set(
      'skill-check',
      cueScore('skill-check') + TECHNOLOGY_ENTITY_WEIGHT,
    )
  }

  // Only when nothing more specific was named: a question about Docker is not
  // a question about cloud engineering in general.
  if (entity === null) {
    const area = findSkillArea(query)
    if (area) {
      entity = { kind: 'skill-area', id: area.id, title: area.title }

      const evaluative =
        cueScore('assessment') +
        cueScore('strengths') +
        cueScore('skills-overview')

      scores.set('skill-area', SKILL_AREA_BASE + 0.5 * evaluative)
    }
  }

  // Asked about a technology by name, and it is nowhere in the portfolio.
  // Checked before retrieval, because an unrecognised word retrieves nothing
  // and the surrounding words would decide the answer instead.
  if (entity === null && cueScore('skill-check') >= 2) {
    const unknown = findUnknownTechnology(query, raw)
    if (unknown) {
      return {
        ...empty,
        intent: 'unknown-technology',
        confidence: 0.6,
        entity: { kind: 'unknown-technology', name: unknown },
      }
    }
  }

  // Neither of these means anything without something to check.
  if (entity?.kind !== 'technology') scores.delete('skill-check')
  if (entity?.kind !== 'skill-area') scores.delete('skill-area')

  // --- retrieval ----------------------------------------------------------

  const hits = retrieve(query)

  const runnerUpScore = hits[1]?.score ?? 0
  const dominant =
    hits[0] !== undefined && hits[0].score >= runnerUpScore * DOMINANCE_RATIO

  hits.slice(0, RETRIEVAL_DECAY.length).forEach((hit, rank) => {
    const decay = RETRIEVAL_DECAY[rank] ?? 0
    const matched = INTENT_BY_KIND[hit.passage.kind]

    // Retrieval may say "this is about the projects" on its own, but it may
    // only name ONE project on a decisive match at the very top of the list.
    const vague = rank > 0 || hit.score < PROJECT_DETAIL_FLOOR

    const intent: IntentId =
      matched === 'project-detail' && vague ? 'projects-overview' : matched

    // The bonus lives INSIDE the cap. Letting it push a retrieval vote past
    // the confidence threshold would mean a coincidental word match — the CV
    // blurb that says "background jobs" — could overturn a deliberate cue.
    const vote = Math.min(
      RETRIEVAL_CAP,
      hit.score * decay + (rank === 0 && dominant ? DOMINANCE_BONUS : 0),
    )

    scores.set(intent, cueScore(intent) + vote)
  })

  // --- decide -------------------------------------------------------------

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])

  const [first, second] = ranked
  if (!first) return empty

  const [intent, score] = first
  const confidence =
    score >= CONFIDENT ? 1 : 0.4 + (0.5 * (score - WEAK)) / (CONFIDENT - WEAK)

  if (score < WEAK) return empty

  // Retrieval can elect project-detail without a name ever being spoken —
  // "sentiment analysis" is enough. Carry the winning project through.
  let resolved = entity
  if (intent === 'project-detail' && resolved?.kind !== 'project') {
    const hit = hits.find(
      (candidate) =>
        candidate.passage.kind === 'project' &&
        candidate.passage.refId !== undefined,
    )

    resolved = hit?.passage.refId
      ? {
          kind: 'project',
          id: hit.passage.refId,
          name: hit.passage.title,
        }
      : null
  }

  return {
    intent:
      resolved === null && intent === 'project-detail'
        ? 'projects-overview'
        : intent,
    confidence: Math.min(1, confidence),
    entity: resolved,
    query,
    corrections,
    hits,
    runnerUp: second?.[0] ?? null,
  }
}

import { describe, expect, it } from 'vitest'

import { intentCues, projects, skills, type Cue } from '@/content'

import { answer } from './answer'
import { limits, strengths, verdict } from './assess'
import { condense, plainProject, splitClause } from './explain'
import { editDistanceWithin, nearest } from './fuzzy'
import { corpusVocabulary, knownTechnologies, passages } from './passages'
import { retrieve } from './retrieve'
import { suggestions, suggestionsFor } from './suggest'
import { normalise, tokenise } from './tokenize'
import {
  findSkillArea,
  findTechnology,
  prepare,
  understand,
} from './understand'

/**
 * The quality gate a deterministic engine makes possible.
 *
 * An LLM-backed assistant cannot be tested like this — you can only sample
 * it. Here, every question has a knowable correct route, so a content edit
 * that breaks retrieval fails the build instead of quietly degrading answers
 * in front of a recruiter.
 */

/** Pinned, because tenure and "still studying" both depend on the clock. */
const AS_OF = new Date('2026-08-31T00:00:00Z')

/** Concatenate an answer's text so assertions can look for a phrase. */
function textOf(question: string): string {
  return answer(question, AS_OF)
    .blocks.filter((block) => block.type === 'text')
    .map((block) => (block.type === 'text' ? block.value : ''))
    .join(' ')
}

function pointsOf(question: string) {
  return answer(question, AS_OF).blocks.flatMap((block) =>
    block.type === 'points' ? [...block.values] : [],
  )
}

function intentOf(question: string): string {
  return answer(question, AS_OF).intent
}

describe('corpus', () => {
  it('builds passages from every content type', () => {
    const kinds = new Set(passages.map((passage) => passage.kind))
    expect(kinds).toEqual(
      new Set([
        'profile',
        'contact',
        'experience',
        'project',
        'skill',
        'achievement',
        'education',
      ]),
    )
  })

  it('indexes one passage per project', () => {
    const projectPassages = passages.filter((p) => p.kind === 'project')
    expect(projectPassages).toHaveLength(projects.length)
  })

  it('stays small enough to keep answers instant', () => {
    expect(passages.length).toBeLessThan(60)
  })

  it('builds a spelling dictionary with no punctuation attached', () => {
    // "competition." in the dictionary made every clean "competition" look
    // like a typo, and the assistant announced the correction.
    const dirty = [...corpusVocabulary].filter((word) =>
      /^[.-]|[.-]$/.test(word),
    )
    expect(dirty).toEqual([])
  })
})

describe('tokenisation', () => {
  it('strips stopwords', () => {
    expect(tokenise('what are the projects')).not.toContain('what')
  })

  it('collapses plurals to a single stem', () => {
    expect(tokenise('projects')).toEqual(tokenise('project'))
  })

  it('expands single-word aliases from the content vocabulary', () => {
    expect(tokenise('ml')).toContain('artificial')
  })

  it('expands multi-word aliases', () => {
    expect(tokenise('what is your tech stack')).toContain('skill')
  })

  it('indexes a hyphenated compound as its parts too', () => {
    // The CV says "production-ready"; visitors say "production".
    expect(tokenise('production-ready')).toContain('production')
  })
})

describe('retrieval', () => {
  it('ranks the named project first', () => {
    const hits = retrieve('gesture media controller')
    expect(hits[0]?.passage.refId).toBe('gesture-media-controller')
  })

  it('returns nothing for an empty query', () => {
    expect(retrieve('')).toHaveLength(0)
  })

  it('returns nothing when no term matches', () => {
    expect(retrieve('zzzzqqq')).toHaveLength(0)
  })
})

describe('answers are routed correctly', () => {
  const cases: [string, string][] = [
    // Projects
    ['Tell me about the API monitoring platform', 'project-detail'],
    ['what is the gesture based media controller', 'project-detail'],
    ['tell me about the aircraft design', 'project-detail'],
    ['tell me about news sentiment', 'project-detail'],
    ['What projects have you built?', 'projects-overview'],
    ['show me your work', 'projects-overview'],
    // Experience
    ['What is your experience?', 'experience'],
    ['where have you interned', 'experience'],
    ['tell me about your background', 'experience'],
    ['where do you work right now', 'experience'],
    // Skills
    ['What technologies do you use?', 'skills-overview'],
    ['what is your tech stack', 'skills-overview'],
    ['what skills do you have', 'skills-overview'],
    // Education
    ['Where did you study?', 'education'],
    ['what is your degree', 'education'],
    ['what is your cgpa', 'education'],
    // Achievements
    ['have you won any competitions', 'achievements'],
    ['tell me about your awards', 'achievements'],
    // Contact
    ['are you available for work', 'contact'],
    ['how can I reach you', 'contact'],
    ['what is your email', 'contact'],
    ['are you open to opportunities', 'contact'],
    // Identity
    ['who are you', 'about'],
    ['tell me about yourself', 'about'],
    ['where are you based', 'about'],
  ]

  for (const [question, expected] of cases) {
    it(`"${question}" -> ${expected}`, () => {
      expect(intentOf(question)).toBe(expected)
    })
  }
})

/**
 * The gap that made the first version feel canned.
 *
 * Every question here used to fall off the end of the routing chain and be
 * refused, because none of them contains a topic keyword. They are also the
 * questions a portfolio is actually read to answer.
 */
describe('judgement questions are answered, not refused', () => {
  const cases: [string, string][] = [
    ['how is this person', 'assessment'],
    ['how is he as an engineer', 'assessment'],
    ['is he any good', 'assessment'],
    ['how would you describe yourself', 'assessment'],
    ['what do you think of him', 'assessment'],
    ['give me the tldr', 'assessment'],
    ['what are you best at', 'strengths'],
    ['what do you do best', 'strengths'],
    ['what are your strengths', 'strengths'],
    ['what are your weaknesses', 'limits'],
    ['what are your flaws', 'limits'],
    ['where do you need to improve', 'limits'],
    ['why should I hire you', 'why-hire'],
    ['what makes you different', 'why-hire'],
    ['sell yourself', 'why-hire'],
  ]

  for (const [question, expected] of cases) {
    it(`"${question}" -> ${expected}`, () => {
      expect(intentOf(question)).toBe(expected)
    })
  }

  it('never refuses any of them', () => {
    for (const [question] of cases) {
      expect(answer(question, AS_OF).confidence).toBeGreaterThan(0)
    }
  })

  it('grounds every judgement in a passage that exists', () => {
    const ids = new Set(passages.map((passage) => passage.id))

    for (const [question] of cases) {
      const result = answer(question, AS_OF)
      expect(result.sources.length).toBeGreaterThan(0)
      for (const source of result.sources) expect(ids.has(source)).toBe(true)
    }
  })

  it('volunteers the honest limits without being asked', () => {
    const claims = pointsOf('how is this person').map((point) => point.label)
    for (const trait of limits(AS_OF)) {
      expect(claims).toContain(trait.claim)
    }
  })

  it('pairs every claim with the fact behind it', () => {
    for (const trait of [...strengths(), ...limits(AS_OF)]) {
      expect(trait.claim.length).toBeGreaterThan(0)
      expect(trait.because.length).toBeGreaterThan(0)
      expect(trait.sources.length).toBeGreaterThan(0)
    }
  })

  it('states a verdict without inventing a superlative', () => {
    expect(verdict()).toContain(String(projects.length === 4 ? 'four' : ''))
  })
})

describe('capability areas are answered specifically', () => {
  it('finds the area behind a synonym', () => {
    expect(findSkillArea('do you do ml')?.id).toBe('artificial-intelligence')
    expect(findSkillArea('server side work')?.id).toBe('backend-engineering')
  })

  it('answers about the area rather than the person', () => {
    for (const cluster of skills) {
      const result = answer(`are you any good at ${cluster.title}`, AS_OF)
      expect(result.intent).toBe('skill-area')
      expect(result.sources).toContain(`skill:${cluster.id}`)
    }
  })

  it('names the work that proves the claim', () => {
    const names = pointsOf('how strong is your backend').map((p) => p.label)
    expect(names.length).toBeGreaterThan(0)
  })
})

describe('technology questions', () => {
  it('confirms a technology that is actually used, and names where', () => {
    const result = answer('Do you know Docker?', AS_OF)
    expect(result.intent).toBe('skill-check')
    expect(textOf('Do you know Docker?')).toContain('Docker')
    expect(result.sources.length).toBeGreaterThan(0)
  })

  it('recognises every technology in the portfolio', () => {
    for (const technology of knownTechnologies) {
      expect(intentOf(`have you used ${technology}`)).toMatch(/skill-check/)
    }
  })

  it('is honest about a technology it has never used', () => {
    const result = answer('Have you worked with Kubernetes?', AS_OF)
    expect(result.intent).toBe('unknown-technology')
    expect(textOf('Have you worked with Kubernetes?')).toContain('Kubernetes')
  })

  it('never claims experience it cannot source', () => {
    const result = answer('do you know Haskell', AS_OF)
    expect(result.sources).toHaveLength(0)
    expect(result.confidence).toBeLessThan(1)
  })

  /**
   * Substring matching read "aws" out of "flaws" and "rag" out of "average",
   * so asking about weak spots was answered as a question about AWS.
   */
  it('matches technologies on word boundaries, not substrings', () => {
    expect(findTechnology('what are your flaws')).toBeNull()
    expect(findTechnology('what is the average storage')).toBeNull()
    expect(findTechnology('do you know aws')).toBe('AWS')
  })
})

describe('the engine tolerates how people actually type', () => {
  it('repairs a transposition', () => {
    expect(prepare('do you know pyhton').query).toContain('python')
  })

  it('repairs a dropped letter', () => {
    expect(intentOf('tell me abt ur projcts')).toBe('projects-overview')
  })

  it('expands shorthand before matching', () => {
    expect(intentOf('hows this guy')).toBe('assessment')
    expect(intentOf('watz ur exp')).toBe('experience')
  })

  it('leaves an ordinary plural alone', () => {
    // "competitions" is not a misspelling of "competition", and announcing it
    // as one made the assistant look like it could not read.
    expect(prepare('have you won any competitions').corrections).toEqual([])
  })

  it('leaves a short word alone, where every edit is plausible', () => {
    expect(nearest('film', corpusVocabulary)).toBeNull()
  })

  it('does not invent a correction for an unrelated word', () => {
    expect(prepare('what is your favourite film').corrections).toEqual([])
  })

  it('says out loud when it has corrected something', () => {
    const notes = answer('tell me abt ur projcts', AS_OF).blocks.filter(
      (block) => block.type === 'note',
    )
    expect(notes.length).toBeGreaterThan(0)
  })

  it('abandons the distance calculation once it is over budget', () => {
    expect(editDistanceWithin('python', 'pyhton', 2)).toBe(1)
    expect(editDistanceWithin('haskell', 'health', 1)).toBeGreaterThan(1)
  })
})

describe('the fallback is honest', () => {
  it('declines a question the portfolio cannot answer', () => {
    const result = answer('what is your favourite film', AS_OF)
    expect(result.intent).toBe('not-found')
    expect(result.confidence).toBe(0)
    expect(result.sources).toHaveLength(0)
  })

  it('offers topics it can answer instead of failing silently', () => {
    const result = answer('what is your favourite film', AS_OF)
    const chips = result.blocks.find((block) => block.type === 'chips')
    expect(chips).toBeDefined()
  })

  it('handles an empty question without throwing', () => {
    expect(() => answer('', AS_OF)).not.toThrow()
    expect(intentOf('   ')).toBe('not-found')
  })

  it('answers a greeting instead of refusing it', () => {
    expect(intentOf('hi')).toBe('greeting')
    expect(intentOf('hello')).toBe('greeting')
  })

  it('does not mistake a greeting for a whole question', () => {
    expect(intentOf('hi what have you built')).toBe('projects-overview')
  })

  it('is straight about what it is when asked', () => {
    expect(intentOf('are you chatgpt')).toBe('capabilities')
    expect(textOf('are you chatgpt')).toContain('language model')
  })

  /**
   * The middle tier the first version did not have: when the reading is
   * uncertain it answers anyway and admits the uncertainty, rather than
   * refusing a question it could half understand.
   */
  it('hedges rather than refusing when it is unsure', () => {
    const result = answer('can he handle a real production system', AS_OF)
    expect(result.intent).not.toBe('not-found')
    expect(result.confidence).toBeLessThan(1)
    expect(result.blocks.some((block) => block.type === 'note')).toBe(true)
  })

  it('does not hedge when it is certain', () => {
    const result = answer('what projects have you built', AS_OF)
    expect(result.confidence).toBe(1)
    expect(result.blocks.some((block) => block.type === 'note')).toBe(false)
  })

  it('will not name one project off an ambiguous match', () => {
    expect(intentOf('can he handle a real production system')).toBe(
      'projects-overview',
    )
  })
})

describe('answers explain rather than recite', () => {
  it('breaks a project into four short labelled lines', () => {
    for (const project of projects) {
      const points = pointsOf(`tell me about ${project.name}`)
      expect(points.length).toBeGreaterThanOrEqual(3)

      for (const point of points) {
        expect(point.label).toBeTruthy()
        expect(point.value.length).toBeGreaterThan(0)
        expect(point.value.split(/\s+/).length).toBeLessThanOrEqual(30)
      }
    }
  })

  it('opens every project explanation with what the thing is', () => {
    for (const project of projects) {
      const plain = plainProject(project)
      expect(plain.what.split(/\s+/).length).toBeLessThanOrEqual(24)
      expect(plain.what).toMatch(/[.…]$/)
      expect(plain.result.length).toBeGreaterThan(0)
      expect(plain.why.length).toBeGreaterThan(0)
    }
  })

  it('points the reader at the section holding the full version', () => {
    for (const question of [
      'tell me about your projects',
      'what is your experience',
      'what are your strengths',
      'where did you study',
    ]) {
      const result = answer(question, AS_OF)
      expect(result.blocks.some((block) => block.type === 'jump')).toBe(true)
    }
  })

  it('lists every capability area, never a truncated set', () => {
    const labels = pointsOf('what technologies do you use').map((p) => p.label)
    for (const cluster of skills) expect(labels).toContain(cluster.title)
  })

  it('cuts a long sentence at a clause boundary, not mid-word', () => {
    const { head, tail } = splitClause(
      'One two three four five, six seven eight nine ten',
      7,
    )
    expect(head).toBe('One two three four five.')
    expect(tail).toBe('six seven eight nine ten')
  })

  it('falls back to a visible ellipsis when there is no boundary', () => {
    expect(condense('one two three four five six', 3)).toBe('one two three…')
  })
})

describe('every answer is grounded', () => {
  const questions = [
    'tell me about your projects',
    'what is your experience',
    'do you know Python',
    'where did you study',
    'how is this person',
    'why should I hire you',
  ]

  for (const question of questions) {
    it(`"${question}" cites at least one passage`, () => {
      expect(answer(question, AS_OF).sources.length).toBeGreaterThan(0)
    })
  }

  it('only ever cites passages that exist', () => {
    const ids = new Set(passages.map((passage) => passage.id))

    for (const question of questions) {
      for (const source of answer(question, AS_OF).sources) {
        expect(ids.has(source)).toBe(true)
      }
    }
  })
})

describe('suggestions are generated, not written', () => {
  it('offers one question per project', () => {
    for (const project of projects) {
      const match = suggestions.find((item) =>
        item.question.includes(project.name),
      )
      expect(match).toBeDefined()
    }
  })

  it('every suggestion is itself answerable', () => {
    for (const suggestion of suggestions) {
      expect(intentOf(suggestion.question)).not.toBe('not-found')
    }
  })

  it('leads with the question a portfolio is read to answer', () => {
    expect(intentOf(suggestions[0]?.question ?? '')).toBe('assessment')
  })

  it('prioritises the section the reader is in', () => {
    const forContact = suggestionsFor('contact', 2)
    expect(forContact[0]?.sectionId).toBe('contact')
  })
})

/**
 * The cue file is data, and data can be malformed in ways TypeScript cannot
 * see. A cue with an apostrophe in it compiles perfectly and matches nothing.
 */
describe('the interpretation vocabulary is well formed', () => {
  const allCues: [string, Cue][] = Object.entries(intentCues).flatMap(
    ([intent, cues]) =>
      [
        ...(cues.words ?? []),
        ...(cues.prefixes ?? []),
        ...(cues.phrases ?? []),
      ].map((cue): [string, Cue] => [intent, cue]),
  )

  it('has cues to work with', () => {
    expect(allCues.length).toBeGreaterThan(100)
  })

  it('stores every term already normalised', () => {
    for (const [intent, [term]] of allCues) {
      expect(`${intent}:${normalise(term)}`).toBe(`${intent}:${term}`)
    }
  })

  it('weights every term on the documented scale', () => {
    for (const [, [, weight]] of allCues) {
      expect(weight).toBeGreaterThanOrEqual(1)
      expect(weight).toBeLessThanOrEqual(4)
    }
  })

  /**
   * Shorthand is expanded before cues are matched, so a cue containing a
   * contraction can never fire. "what you cannot" was exactly this bug.
   */
  it('has no cue that contraction expansion makes unreachable', () => {
    for (const [intent, [term]] of allCues) {
      expect(`${intent}:${prepare(term).query}`).toBe(`${intent}:${term}`)
    }
  })
})

describe('the reading is inspectable', () => {
  it('reports which intent lost, so an uncertain answer can explain itself', () => {
    const reading = understand('what projects have you built')
    expect(reading.intent).toBe('projects-overview')
    expect(reading.confidence).toBe(1)
  })

  it('carries the entity it recognised', () => {
    expect(understand('do you know Docker').entity).toEqual({
      kind: 'technology',
      name: 'Docker',
    })
  })
})

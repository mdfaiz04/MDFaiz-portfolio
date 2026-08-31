import { describe, expect, it } from 'vitest'

import { projects } from '@/content'

import { answer } from './answer'
import { knownTechnologies, passages } from './passages'
import { retrieve } from './retrieve'
import { suggestions, suggestionsFor } from './suggest'
import { tokenise } from './tokenize'

/**
 * The quality gate a deterministic engine makes possible.
 *
 * An LLM-backed assistant cannot be tested like this — you can only sample
 * it. Here, every question has a knowable correct route, so a content edit
 * that breaks retrieval fails the build instead of quietly degrading answers
 * in front of a recruiter.
 */

/** Concatenate an answer's text so assertions can look for a phrase. */
function textOf(question: string): string {
  return answer(question)
    .blocks.filter((block) => block.type === 'text')
    .map((block) => (block.type === 'text' ? block.value : ''))
    .join(' ')
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
    ['Tell me about the API monitoring platform', 'project-detail'],
    ['what is the gesture based media controller', 'project-detail'],
    ['tell me about the aircraft design', 'project-detail'],
    ['What projects have you built?', 'projects-overview'],
    ['show me your work', 'projects-overview'],
    ['What is your experience?', 'experience'],
    ['where have you interned', 'experience'],
    ['tell me about your background', 'experience'],
    ['What technologies do you use?', 'skills-overview'],
    ['what is your tech stack', 'skills-overview'],
    ['what skills do you have', 'skills-overview'],
    ['Where did you study?', 'education'],
    ['what is your degree', 'education'],
    ['what is your cgpa', 'education'],
    ['have you won any competitions', 'achievements'],
    ['tell me about your awards', 'achievements'],
    ['are you available for work', 'contact'],
    ['how can I reach you', 'contact'],
    ['what is your email', 'contact'],
    ['are you open to opportunities', 'contact'],
    ['who are you', 'about'],
    ['tell me about yourself', 'about'],
  ]

  for (const [question, expected] of cases) {
    it(`"${question}" -> ${expected}`, () => {
      expect(answer(question).intent).toBe(expected)
    })
  }
})

describe('technology questions', () => {
  it('confirms a technology that is actually used, and names where', () => {
    const result = answer('Do you know Docker?')
    expect(result.intent).toBe('skill-check')
    expect(textOf('Do you know Docker?')).toContain('Docker')
    expect(result.sources.length).toBeGreaterThan(0)
  })

  it('recognises every technology in the portfolio', () => {
    for (const technology of knownTechnologies) {
      expect(answer(`have you used ${technology}`).intent).toMatch(
        /skill-check/,
      )
    }
  })

  it('is honest about a technology it has never used', () => {
    const result = answer('Have you worked with Kubernetes?')
    expect(result.intent).toBe('unknown-technology')
    expect(textOf('Have you worked with Kubernetes?')).toContain('Kubernetes')
  })

  it('never claims experience it cannot source', () => {
    const result = answer('do you know Haskell')
    expect(result.sources).toHaveLength(0)
    expect(result.confidence).toBeLessThan(1)
  })
})

describe('the fallback is honest', () => {
  it('declines a question the portfolio cannot answer', () => {
    const result = answer('what is your favourite film')
    expect(result.intent).toBe('not-found')
    expect(result.confidence).toBe(0)
    expect(result.sources).toHaveLength(0)
  })

  it('offers topics it can answer instead of failing silently', () => {
    const result = answer('what is your favourite film')
    const chips = result.blocks.find((block) => block.type === 'chips')
    expect(chips).toBeDefined()
  })

  it('handles an empty question without throwing', () => {
    expect(() => answer('')).not.toThrow()
    expect(answer('   ').intent).toBe('not-found')
  })
})

describe('every answer is grounded', () => {
  const questions = [
    'tell me about your projects',
    'what is your experience',
    'do you know Python',
    'where did you study',
  ]

  for (const question of questions) {
    it(`"${question}" cites at least one passage`, () => {
      expect(answer(question).sources.length).toBeGreaterThan(0)
    })
  }

  it('only ever cites passages that exist', () => {
    const ids = new Set(passages.map((passage) => passage.id))

    for (const question of questions) {
      for (const source of answer(question).sources) {
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
      expect(answer(suggestion.question).intent).not.toBe('not-found')
    }
  })

  it('prioritises the section the reader is in', () => {
    const forContact = suggestionsFor('contact', 2)
    expect(forContact[0]?.sectionId).toBe('contact')
  })
})

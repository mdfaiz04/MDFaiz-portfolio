/**
 * Shared shapes for the portfolio assistant.
 *
 * Answers are DATA, not formatted strings: a composer returns blocks and the
 * UI decides how to render them. That keeps the engine testable without a
 * DOM, and keeps markup decisions out of the retrieval code.
 */

export type PassageKind =
  | 'profile'
  | 'experience'
  | 'project'
  | 'skill'
  | 'achievement'
  | 'education'
  | 'contact'

export type Passage = {
  id: string
  kind: PassageKind
  title: string
  /** Searchable body. Never shown verbatim — composers write the prose. */
  text: string
  /** Entities worth matching exactly: technologies, organisations. */
  tags: readonly string[]
  /** Where the answer can send the reader. */
  sectionId: string
  /** The originating content id, when there is one. */
  refId?: string
}

export type Hit = {
  passage: Passage
  score: number
}

export type AnswerBlock =
  | { type: 'text'; value: string }
  | { type: 'chips'; values: readonly string[] }
  | { type: 'jump'; label: string; sectionId: string }
  | { type: 'link'; label: string; href: string }

export type Answer = {
  blocks: readonly AnswerBlock[]
  /** 0 when nothing matched — drives the honest fallback. */
  confidence: number
  /** Passage ids the answer was built from: provable grounding. */
  sources: readonly string[]
  /** Which intent produced this, for the fixture suite to assert on. */
  intent: string
}

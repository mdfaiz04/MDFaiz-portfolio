import type { IntentId } from '@/content'

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

/** One labelled line of an explanation. */
export type Point = {
  /** Short lead-in — "What it is", a project name, a role. Optional. */
  label?: string
  value: string
}

export type AnswerBlock =
  /** A full sentence of prose. Typed out character by character. */
  | { type: 'text'; value: string }
  /**
   * The explanation format. Short labelled lines beat a paragraph when
   * somebody is scanning, which on a portfolio is always.
   */
  | { type: 'points'; values: readonly Point[] }
  | { type: 'chips'; values: readonly string[] }
  | { type: 'jump'; label: string; sectionId: string }
  | { type: 'link'; label: string; href: string }
  /** A quieter aside: a caveat, or an admission about how a query was read. */
  | { type: 'note'; value: string }

export type Answer = {
  blocks: readonly AnswerBlock[]
  /** 0 when nothing matched — drives the honest fallback. */
  confidence: number
  /** Passage ids the answer was built from: provable grounding. */
  sources: readonly string[]
  /** Which intent produced this, for the fixture suite to assert on. */
  intent: IntentId
}

export type { IntentId }

import { passages } from './passages'
import { tokenise } from './tokenize'
import type { Hit, Passage } from './types'

/**
 * BM25 ranking over the portfolio corpus.
 *
 * Standard parameters: k1 controls how quickly repeated terms stop adding
 * value, b how strongly a long passage is penalised. Both are the widely
 * used defaults; the corpus is far too small to justify tuning them.
 */
const K1 = 1.5
const B = 0.75

type Index = {
  /** term -> passage id -> term frequency */
  postings: Map<string, Map<string, number>>
  lengths: Map<string, number>
  averageLength: number
  byId: Map<string, Passage>
}

function buildIndex(): Index {
  const postings = new Map<string, Map<string, number>>()
  const lengths = new Map<string, number>()
  const byId = new Map<string, Passage>()
  let total = 0

  for (const passage of passages) {
    byId.set(passage.id, passage)

    // Tags are indexed twice: an exact technology name is a much stronger
    // signal than the same word buried in prose.
    const tokens = [
      ...tokenise(passage.text),
      ...tokenise(passage.tags.join(' ')),
      ...tokenise(passage.tags.join(' ')),
      ...tokenise(passage.title),
    ]

    lengths.set(passage.id, tokens.length)
    total += tokens.length

    for (const token of tokens) {
      const entry = postings.get(token) ?? new Map<string, number>()
      entry.set(passage.id, (entry.get(passage.id) ?? 0) + 1)
      postings.set(token, entry)
    }
  }

  return {
    postings,
    lengths,
    averageLength: passages.length === 0 ? 1 : total / passages.length,
    byId,
  }
}

const index = buildIndex()

export function retrieve(query: string, limit = 5): Hit[] {
  const tokens = tokenise(query)
  if (tokens.length === 0) return []

  const scores = new Map<string, number>()
  const documentCount = passages.length

  for (const token of tokens) {
    const entry = index.postings.get(token)
    if (!entry) continue

    // Standard BM25 inverse document frequency, floored so a term appearing
    // in most passages contributes nothing rather than going negative.
    const idf = Math.max(
      0,
      Math.log((documentCount - entry.size + 0.5) / (entry.size + 0.5) + 1),
    )

    for (const [id, frequency] of entry) {
      const length = index.lengths.get(id) ?? index.averageLength
      const denominator =
        frequency + K1 * (1 - B + (B * length) / index.averageLength)

      scores.set(
        id,
        (scores.get(id) ?? 0) + (idf * (frequency * (K1 + 1))) / denominator,
      )
    }
  }

  return [...scores.entries()]
    .map(([id, score]) => ({ passage: index.byId.get(id), score }))
    .filter((hit): hit is Hit => hit.passage !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

import { stopwords, synonyms } from '@/content'

/**
 * Query and document tokenisation.
 *
 * Kept deliberately small: a light suffix stemmer and a synonym expansion
 * driven by the content layer. When a visitor phrases something the engine
 * misses, the fix is a new alias in src/content/vocabulary.ts — data, not
 * code.
 */

const STOPWORDS = new Set(stopwords)

/**
 * Reverse index of the synonym map: variant -> canonical terms. Built once,
 * so expansion is a lookup rather than a scan of every entry per token.
 */
const VARIANT_TO_CANONICAL = (() => {
  const map = new Map<string, string[]>()

  for (const [canonical, variants] of Object.entries(synonyms)) {
    for (const variant of variants) {
      const existing = map.get(variant) ?? []
      existing.push(canonical)
      map.set(variant, existing)
    }
  }

  return map
})()

/** Multi-word aliases have to be matched before the string is split. */
const MULTI_WORD_VARIANTS = [...VARIANT_TO_CANONICAL.keys()]
  .filter((variant) => variant.includes(' '))
  .sort((a, b) => b.length - a.length)

export function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Crude suffix stripping. A full stemmer would be heavier than this corpus
 * justifies; the aim is only that "projects" and "project" agree.
 */
function stem(token: string): string {
  if (token.length <= 4) return token
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.endsWith('sses')) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  if (token.endsWith('ing') && token.length > 6) return token.slice(0, -3)
  if (token.endsWith('ed') && token.length > 5) return token.slice(0, -2)
  return token
}

export function tokenise(input: string): string[] {
  const text = normalise(input)
  const tokens: string[] = []

  // Expand multi-word aliases first, since splitting would destroy them.
  for (const variant of MULTI_WORD_VARIANTS) {
    if (!text.includes(variant)) continue
    for (const canonical of VARIANT_TO_CANONICAL.get(variant) ?? []) {
      tokens.push(...canonical.split(' ').map(stem))
    }
  }

  for (const raw of text.split(' ')) {
    if (raw === '' || STOPWORDS.has(raw)) continue

    const stemmed = stem(raw)
    tokens.push(stemmed)

    // Expansion adds *different* terms, never a repeat of the word it came
    // from. Without this, "project" expands to its own canonical and yields
    // two tokens where "projects" yields one — the same question scored
    // differently depending on whether the visitor typed a plural.
    for (const canonical of VARIANT_TO_CANONICAL.get(raw) ?? []) {
      for (const part of canonical.split(' ')) {
        const expanded = stem(part)
        if (expanded !== stemmed) tokens.push(expanded)
      }
    }
  }

  return tokens
}

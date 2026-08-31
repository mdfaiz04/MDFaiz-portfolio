/**
 * Plain-language compression.
 *
 * CV prose is written to be complete; an answer needs to be understood at a
 * glance. This module turns the former into the latter WITHOUT a second copy
 * of the text anywhere: every short line here is cut from the long line in
 * src/content, so editing the CV still edits the answers.
 *
 * That constraint is the whole design. A hand-written "short version" field
 * would read better on day one and be wrong by month three.
 */

/** Words that end in a full stop without ending a sentence. */
const ABBREVIATIONS = new Set(['e.g', 'i.e', 'etc', 'vs', 'no', 'approx'])

function endsSentence(word: string): boolean {
  if (!/[.!?]$/.test(word)) return false

  const stem = word.replace(/[.!?]+$/, '').toLowerCase()

  // "B.E." and "5th Place." differ only in that one is an initialism, and a
  // single trailing letter is the reliable tell.
  if (stem.length <= 1) return false
  if (ABBREVIATIONS.has(stem)) return false

  return true
}

/** Split prose into sentences, tolerating initialisms like "B.E.". */
export function sentences(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const out: string[] = []
  let current: string[] = []

  for (const word of words) {
    current.push(word)
    if (endsSentence(word)) {
      out.push(current.join(' '))
      current = []
    }
  }

  if (current.length > 0) out.push(current.join(' '))

  return out
}

export function firstSentence(text: string): string {
  return sentences(text)[0] ?? text.trim()
}

/** Ensure exactly one terminal full stop, without doubling existing marks. */
export function terminate(text: string): string {
  const trimmed = text.trim().replace(/[\s,;:—–-]+$/, '')
  if (trimmed === '') return ''
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

export function capitalise(text: string): string {
  const trimmed = text.trim()
  if (trimmed === '') return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Cut a long sentence in two at the last natural clause boundary that fits.
 *
 * Returns the readable head and whatever is left, so a caller can present the
 * detail as a second line rather than throwing it away. Falling back to an
 * ellipsis is deliberate: a truncated sentence should look truncated.
 */
export function splitClause(
  text: string,
  maxWords: number,
): { head: string; tail: string } {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return { head: terminate(text), tail: '' }

  for (
    let index = maxWords - 1;
    index >= Math.floor(maxWords / 2);
    index -= 1
  ) {
    const word = words[index]
    if (word === undefined) continue

    if (/[,;:—–]$/.test(word)) {
      return {
        head: terminate(words.slice(0, index + 1).join(' ')),
        tail: words.slice(index + 1).join(' '),
      }
    }
  }

  return {
    head: `${words
      .slice(0, maxWords)
      .join(' ')
      .replace(/[\s,;:—–-]+$/, '')}…`,
    tail: words.slice(maxWords).join(' '),
  }
}

/** The head of `splitClause` when the remainder is not wanted. */
export function condense(text: string, maxWords: number): string {
  return splitClause(text, maxWords).head
}

/** Shape of the four lines a project is explained in. */
export type PlainProject = {
  /** One line: what the thing actually is. */
  what: string
  /** One line: the problem it exists to solve. */
  why: string
  /** One line: how it is put together. Empty when there is nothing to add. */
  how: string
  /** One line: what came out of it. */
  result: string
}

type ExplainableProject = {
  readonly problem: string
  readonly approach: string
  readonly outcome: string
}

/**
 * Turn a project into four short, plain lines.
 *
 * `approach` in the content layer is consistently written as
 * "<what it is> — <how it is built>", so the em dash does most of the work.
 * Where there is no dash, the first clause of the sentence serves as "what"
 * and the rest becomes "how", which reads the same way.
 */
export function plainProject(project: ExplainableProject): PlainProject {
  const [lead = '', ...rest] = project.approach.split(' — ')
  const opening = firstSentence(lead)
  const { head, tail } = splitClause(opening, 22)

  const how = rest.length > 0 ? rest.join(' — ') : tail

  return {
    what: head,
    why: condense(project.problem, 26),
    how: how === '' ? '' : terminate(capitalise(how)),
    result: condense(project.outcome, 26),
  }
}

/** "a, b and c" — the readable join, used everywhere a list is spoken. */
export function list(items: readonly string[]): string {
  const clean = items.filter((item) => item !== '')
  if (clean.length === 0) return ''
  if (clean.length === 1) return clean[0] ?? ''
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`
}

/** `1` → "one" … `12` → "twelve"; anything larger stays a numeral. */
const SPELLED = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const

export function spell(count: number): string {
  return SPELLED[count] ?? String(count)
}

/** `(2, "project")` → "two projects" */
export function plural(count: number, noun: string): string {
  return `${spell(count)} ${noun}${count === 1 ? '' : 's'}`
}

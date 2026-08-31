/**
 * Typo tolerance.
 *
 * People type "protfolio", "expierence" and "pyhton", and an assistant that
 * shrugs at a transposed letter feels broken in a way no amount of good
 * ranking makes up for.
 *
 * The repair is deliberately timid. Rewriting a word the visitor meant is a
 * worse failure than not recognising one, so a candidate has to be close, has
 * to start with the same letter, and short words are never touched at all —
 * at four characters almost everything is within one edit of everything else.
 */

/** Below this length, a word is left exactly as typed. */
const MIN_LENGTH = 5

/** Edit budget by word length. Longer words earn more room. */
function budgetFor(length: number): number {
  return length >= 8 ? 2 : 1
}

/**
 * Damerau-Levenshtein distance, abandoned as soon as it exceeds `max`.
 *
 * The transposition case is what earns its keep here: "pyhton" is one swap
 * from "python" but two substitutions under plain Levenshtein, and swaps are
 * the single most common typing error.
 */
export function editDistanceWithin(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1

  let previous: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)
  let beforePrevious: number[] = []

  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i]
    let best = i

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1

      let value = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (beforePrevious[j - 2] ?? 0) + 1)
      }

      current.push(value)
      if (value < best) best = value
    }

    // Every remaining row can only add to the minimum, so once the whole row
    // is over budget the answer is settled.
    if (best > max) return max + 1

    beforePrevious = previous
    previous = current
  }

  const distance = previous[b.length] ?? max + 1
  return distance > max ? max + 1 : distance
}

/**
 * Is this word an ordinary inflection of one the corpus already knows?
 *
 * The corpus says "competition"; a visitor writes "competitions". That is not
 * a typo, and repairing it announced "reading competitions as competition",
 * which makes the assistant look like it cannot read. Stemming happens later,
 * during retrieval, where it belongs.
 */
function isInflection(word: string, vocabulary: ReadonlySet<string>): boolean {
  const forms = [
    word.replace(/s$/, ''),
    word.replace(/es$/, ''),
    word.replace(/ies$/, 'y'),
    word.replace(/ing$/, ''),
    word.replace(/ed$/, ''),
    `${word}s`,
    `${word}e`,
  ]

  return forms.some((form) => form !== word && vocabulary.has(form))
}

/**
 * The closest known word, or null when nothing is close enough.
 *
 * Requiring the same first character is a cheap, very effective guard: people
 * mistype the middle of a word far more often than the start of it, and it
 * stops "favourite" from being repaired into "fastapi".
 */
export function nearest(
  word: string,
  vocabulary: ReadonlySet<string>,
): string | null {
  if (word.length < MIN_LENGTH) return null
  if (vocabulary.has(word)) return word
  if (isInflection(word, vocabulary)) return word

  const budget = budgetFor(word.length)
  const initial = word[0]
  let best: string | null = null
  let bestDistance = budget + 1

  for (const candidate of vocabulary) {
    if (candidate.length < 4) continue
    if (candidate[0] !== initial) continue
    if (Math.abs(candidate.length - word.length) > budget) continue

    const distance = editDistanceWithin(word, candidate, bestDistance - 1)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
      if (distance === 1) break
    }
  }

  return best
}

export type Repair = { text: string; corrections: [string, string][] }

/**
 * Repair a normalised query.
 *
 * Two vocabularies, not one, because they answer different questions.
 * `recognised` is every word we know to be a real word — a word in it is
 * never touched. `targets` is the smaller set a typo may be corrected TO.
 *
 * Collapsing them was a bug: the router's own cue "competent" is not in the
 * portfolio text, so it was helpfully repaired to "competed", which appears
 * in a competition result. Every cue word is a real word; only corpus words
 * are worth correcting toward.
 *
 * Corrections are returned alongside the text so the answer can own up to
 * them. Silently swapping a word is how an assistant answers a question
 * nobody asked.
 */
export function repair(
  normalised: string,
  targets: ReadonlySet<string>,
  recognised: ReadonlySet<string> = targets,
): Repair {
  const corrections: [string, string][] = []

  const text = normalised
    .split(' ')
    .map((word) => {
      if (word === '' || recognised.has(word)) return word

      const match = nearest(word, targets)
      if (match === null || match === word) return word

      corrections.push([word, match])
      return match
    })
    .join(' ')

  return { text, corrections }
}

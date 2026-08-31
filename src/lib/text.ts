/**
 * Small text shaping shared by the page and its components.
 *
 * Both functions exist to avoid writing a fact down twice. A name split into
 * two styled halves, or a shortened list of tools, is a presentation of
 * content — never a second copy of it.
 */

/**
 * Split a name into the part that takes the accent and the part that does not.
 *
 * The hero and the wordmark both set the first word in gradient. Deriving the
 * split from the name means a change in src/content flows through to both,
 * and a single-word name still renders correctly with an empty second half.
 */
export function splitName(name: string): { lead: string; rest: string } {
  const [lead = name, ...rest] = name.trim().split(/\s+/)
  return { lead, rest: rest.join(' ') }
}

/**
 * Join as many items as fit inside a character budget.
 *
 * A card's detail line has room for roughly one line of text. Taking a fixed
 * `slice(0, 3)` overflows as soon as one item is long — "Retrieval-Augmented
 * Generation" alone is longer than most three-item lists. Budgeting by width
 * degrades gracefully instead: a long name simply means fewer names.
 *
 * Always returns at least the first item, even when it exceeds the budget on
 * its own, because an empty line is worse than a long one.
 */
export function joinWithin(
  items: readonly string[],
  maxChars: number,
  separator = ', ',
): string {
  const [first, ...rest] = items
  if (first === undefined) return ''

  let line = first

  for (const item of rest) {
    const next = `${line}${separator}${item}`
    if (next.length > maxChars) break
    line = next
  }

  return line
}

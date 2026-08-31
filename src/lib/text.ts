/**
 * Small text shaping shared by the page and its components.
 *
 * A name split into two styled halves is a presentation of content, never a
 * second copy of it.
 */

/**
 * Split a name into the part that takes the accent and the part that does not.
 *
 * The hero sets the first word in gradient and the rest in ink. Deriving the
 * split from the name means a change in src/content flows through, and a
 * single-word name still renders correctly with an empty second half.
 */
export function splitName(name: string): { lead: string; rest: string } {
  const [lead = name, ...rest] = name.trim().split(/\s+/)
  return { lead, rest: rest.join(' ') }
}

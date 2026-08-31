import {
  counts,
  profile,
  skills,
  technologies,
  visibleSections,
} from '@/content'
import { env } from '@/config/env'
import {
  capitalise,
  firstSentence,
  list,
  plural,
} from '@/lib/assistant/explain'

/**
 * Everything a search engine or a social card needs, derived.
 *
 * Nothing here is typed out. The title is the name and the role, the
 * description is the tagline and the opening line of the CV, the keywords are
 * the technologies actually used. Edit the CV and the search result changes
 * with it — there is no second copy of the pitch to forget about.
 */

/** Google truncates a description around here; longer is wasted work. */
const DESCRIPTION_LIMIT = 160

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${siteUrl}/`).toString()
}

export const siteName = `${profile.name} — ${profile.role}`

/**
 * The one-line pitch, grown only as far as it will actually be shown.
 *
 * The proof clause is appended if — and only if — it still fits inside the
 * limit, so adding a fifth project can never silently push the location out
 * of the search result.
 */
export const siteDescription = (() => {
  const base = `${profile.tagline} ${firstSentence(profile.summary)}`

  // Numerals, not words: a search snippet is scanned, not read, and "4"
  // survives truncation better than "four".
  const proof = `${counts.projects} projects, ${counts.placements} competition placements.`

  const grown = `${base} ${proof}`
  return grown.length <= DESCRIPTION_LIMIT ? grown : base
})()

/**
 * Keywords carry little weight with search engines now, but they cost
 * nothing and they are the one metadata field that is genuinely a list of
 * facts — so it is derived from the same list the page renders.
 */
export const siteKeywords: readonly string[] = [
  profile.name,
  profile.role,
  ...skills.map((cluster) => cluster.title),
  ...technologies,
  profile.location.city,
  profile.location.region,
  profile.location.country,
]

/** Alt text for the social card, describing what the card actually shows. */
export const cardAlt = `${profile.name} — ${profile.role}. ${capitalise(
  plural(counts.projects, 'project'),
)}, ${counts.technologies} technologies, ${plural(
  counts.placements,
  'competition placement',
)}.`

/**
 * The story the page tells, as section names. Used by the social card so the
 * card and the page can never disagree about what is on it.
 */
export const sectionTrail = list(
  visibleSections
    .filter((section) => section.id !== 'hero')
    .map((section) => section.navLabel),
)

/** Headline figures for the social card, from the same counters as the hero. */
export const cardStats: readonly { value: string; label: string }[] = [
  { value: String(counts.projects), label: 'Projects' },
  { value: String(counts.technologies), label: 'Technologies' },
  { value: String(counts.placements), label: 'Placements' },
]

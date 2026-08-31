import {
  achievements,
  education,
  experience,
  formatRange,
  profile,
  projectCategoryLabels,
  projects,
  skills,
  technologies,
} from '@/content'

import { absoluteUrl, siteDescription, siteName, siteUrl } from './site'

/**
 * Structured data, derived from the content layer.
 *
 * This is the machine-readable version of the same CV the page renders, and
 * it is what lets a search engine understand that "MD Faiz" is a person with
 * a job title, an employer, an alma mater and a list of awards — rather than
 * a string that happens to appear in a heading.
 *
 * Every field traces back to src/content. Nothing is asserted here that a
 * visitor could not verify on the page itself, which is both the honest
 * position and the one that survives a manual review.
 */

/** JSON-LD is loosely typed by nature; this keeps the shape honest anyway. */
type Node = Record<string, unknown>

const PERSON = `${siteUrl}/#person`
const WEBSITE = `${siteUrl}/#website`
const PAGE = `${siteUrl}/#profile`

/** Drop keys with nothing behind them, so no empty field is ever published. */
function compact(node: Node): Node {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }),
  )
}

const currentRole = experience.find((role) => role.end === null)

function person(): Node {
  return compact({
    '@type': 'Person',
    '@id': PERSON,
    name: profile.name,
    alternateName: profile.shortName,
    url: siteUrl,
    jobTitle: profile.role,
    description: profile.summary,
    email: `mailto:${profile.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city,
      addressRegion: profile.location.region,
      addressCountry: profile.location.country,
    },
    // Only the profiles that are genuinely the same person elsewhere. A
    // mailto: link here would be a schema error, not a stricter claim.
    sameAs: profile.links
      .filter((link) => link.kind === 'social')
      .map((link) => link.href),
    knowsAbout: [
      ...new Set([...skills.map((cluster) => cluster.title), ...technologies]),
    ],
    alumniOf: education.map((study) => ({
      '@type': 'EducationalOrganization',
      name: study.institution,
    })),
    worksFor: currentRole
      ? { '@type': 'Organization', name: currentRole.org }
      : undefined,
    award: achievements.map(
      (item) => `${item.title}, ${item.event} (${item.year})`,
    ),
  })
}

/**
 * Roles as `OrganizationRole`, so the dates travel with the employer rather
 * than being flattened into a single "works for".
 */
function roles(): Node[] {
  return experience.map((role) =>
    compact({
      '@type': 'OrganizationRole',
      '@id': `${siteUrl}/#role-${role.id}`,
      roleName: role.role,
      description: role.summary,
      startDate: role.start,
      endDate: role.end ?? undefined,
      // Human-readable duplicate of the dates above, for anything that reads
      // the graph without parsing them.
      alternateName: formatRange(role.start, role.end),
      memberOf: { '@type': 'Organization', name: role.org },
    }),
  )
}

function works(): Node[] {
  return projects.map((project) =>
    compact({
      '@type': 'CreativeWork',
      '@id': `${siteUrl}/#project-${project.id}`,
      name: project.name,
      genre: projectCategoryLabels[project.category],
      abstract: project.outcome,
      description: `${project.problem} ${project.approach}`,
      dateCreated: String(project.year),
      keywords: project.stack,
      author: { '@id': PERSON },
      url: project.links[0]?.href,
    }),
  )
}

/**
 * The whole graph, as one object.
 *
 * A `@graph` rather than several separate scripts: it lets every node point
 * at the person by id instead of repeating them, which is both smaller and
 * unambiguous about there being exactly one person here.
 */
export function buildJsonLd(): Node {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      person(),
      ...roles(),
      ...works(),
      compact({
        '@type': 'WebSite',
        '@id': WEBSITE,
        url: siteUrl,
        name: siteName,
        description: siteDescription,
        inLanguage: 'en',
        author: { '@id': PERSON },
        publisher: { '@id': PERSON },
      }),
      compact({
        '@type': 'ProfilePage',
        '@id': PAGE,
        url: absoluteUrl('/'),
        name: siteName,
        description: siteDescription,
        isPartOf: { '@id': WEBSITE },
        about: { '@id': PERSON },
        mainEntity: { '@id': PERSON },
        inLanguage: 'en',
      }),
    ],
  }
}

/**
 * Serialised for a `<script type="application/ld+json">`.
 *
 * `<` is escaped because a `</script>` sequence appearing inside any content
 * string would close the tag early and inject the rest as markup. Nothing in
 * this CV contains one today, which is exactly why it has to be handled here
 * rather than trusted to stay that way.
 */
export function jsonLdScript(): string {
  return JSON.stringify(buildJsonLd()).replace(/</g, '\\u003c')
}

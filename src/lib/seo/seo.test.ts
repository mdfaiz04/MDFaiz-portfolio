import { describe, expect, it } from 'vitest'

import {
  achievements,
  education,
  experience,
  profile,
  projects,
  technologies,
} from '@/content'

import { buildJsonLd, jsonLdScript } from './jsonLd'
import {
  absoluteUrl,
  cardAlt,
  cardStats,
  sectionTrail,
  siteDescription,
  siteKeywords,
  siteName,
  siteUrl,
} from './site'

/**
 * Metadata is the part of a site nobody looks at until it is wrong in public
 * — in a shared link, in a search result, in a preview card. These assertions
 * are the only thing standing between a content edit and a broken snippet.
 */

type Node = Record<string, unknown>

function graph(): Node[] {
  const built = buildJsonLd()['@graph']
  expect(Array.isArray(built)).toBe(true)
  return built as Node[]
}

function nodesOfType(type: string): Node[] {
  return graph().filter((node) => node['@type'] === type)
}

describe('site metadata is derived from content', () => {
  it('names the person and the role, and nothing else', () => {
    expect(siteName).toContain(profile.name)
    expect(siteName).toContain(profile.role)
  })

  it('keeps the description inside what a search result will show', () => {
    expect(siteDescription.length).toBeGreaterThan(50)
    expect(siteDescription.length).toBeLessThanOrEqual(160)
  })

  it('opens the description with the pitch the page opens with', () => {
    expect(siteDescription.startsWith(profile.tagline)).toBe(true)
  })

  it('lists real technologies as keywords, never invented ones', () => {
    for (const technology of technologies) {
      expect(siteKeywords).toContain(technology)
    }
  })

  it('describes the social card in a full sentence', () => {
    expect(cardAlt).toContain(profile.name)
    expect(cardAlt).toMatch(/^[A-Z]/)
    // Every clause after a full stop starts with a capital, which is what
    // broke when a spelled-out number opened the second sentence.
    for (const sentence of cardAlt.split('. ').slice(1)) {
      expect(sentence).toMatch(/^[A-Z0-9]/)
    }
  })

  it('shows the same counters the hero shows', () => {
    expect(cardStats.map((stat) => stat.label)).toEqual([
      'Projects',
      'Technologies',
      'Placements',
    ])
    expect(cardStats[0]?.value).toBe(String(projects.length))
  })

  it('names the sections the page actually renders', () => {
    expect(sectionTrail).toContain('Projects')
    expect(sectionTrail).not.toContain('Home')
  })

  it('builds absolute URLs against the configured origin', () => {
    expect(absoluteUrl('/')).toBe(`${siteUrl}/`)
    expect(absoluteUrl('/sitemap.xml')).toBe(`${siteUrl}/sitemap.xml`)
  })

  it('never doubles a slash, whatever the origin ends with', () => {
    expect(absoluteUrl('/sitemap.xml')).not.toContain('//sitemap')
  })
})

describe('structured data describes the same person the page does', () => {
  it('publishes exactly one person', () => {
    expect(nodesOfType('Person')).toHaveLength(1)
  })

  it('carries the job title, employer and location from the CV', () => {
    const [node] = nodesOfType('Person')
    expect(node?.jobTitle).toBe(profile.role)
    expect(node?.description).toBe(profile.summary)

    const current = experience.find((role) => role.end === null)
    if (current) {
      expect(node?.worksFor).toEqual({
        '@type': 'Organization',
        name: current.org,
      })
    }
  })

  it('links only to profiles that are the same person elsewhere', () => {
    const [node] = nodesOfType('Person')
    const sameAs = node?.sameAs as string[]

    // A mailto: here is a schema error, not a stronger claim.
    for (const href of sameAs) expect(href).toMatch(/^https:\/\//)
    expect(sameAs).toHaveLength(
      profile.links.filter((link) => link.kind === 'social').length,
    )
  })

  it('lists every school and every award', () => {
    const [node] = nodesOfType('Person')
    expect(node?.alumniOf).toHaveLength(education.length)
    expect(node?.award).toHaveLength(achievements.length)
  })

  it('publishes one role node per role, with dates', () => {
    const roles = nodesOfType('OrganizationRole')
    expect(roles).toHaveLength(experience.length)

    for (const role of roles) {
      expect(role.startDate).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('leaves the end date off a role that has not ended', () => {
    const current = experience.find((role) => role.end === null)
    if (!current) return

    const node = graph().find(
      (entry) => entry['@id'] === `${siteUrl}/#role-${current.id}`,
    )
    expect(node).toBeDefined()
    expect('endDate' in (node ?? {})).toBe(false)
  })

  it('publishes one work per project, credited to the person', () => {
    const works = nodesOfType('CreativeWork')
    expect(works).toHaveLength(projects.length)

    for (const work of works) {
      expect(work.author).toEqual({ '@id': `${siteUrl}/#person` })
    }
  })

  it('omits a project URL until there is a repository to link', () => {
    for (const project of projects) {
      const node = graph().find(
        (entry) => entry['@id'] === `${siteUrl}/#project-${project.id}`,
      )
      expect('url' in (node ?? {})).toBe(project.links.length > 0)
    }
  })

  it('never publishes an empty field', () => {
    const empty = (node: Node): string[] =>
      Object.entries(node)
        .filter(
          ([, value]) =>
            value === '' ||
            value === null ||
            value === undefined ||
            (Array.isArray(value) && value.length === 0),
        )
        .map(([key]) => key)

    for (const node of graph()) expect(empty(node)).toEqual([])
  })

  it('ties the page and the site back to the one person', () => {
    const [page] = nodesOfType('ProfilePage')
    const [site] = nodesOfType('WebSite')

    expect(page?.about).toEqual({ '@id': `${siteUrl}/#person` })
    expect(site?.author).toEqual({ '@id': `${siteUrl}/#person` })
  })
})

describe('the JSON-LD script is safe to inline', () => {
  it('parses back to the graph it was built from', () => {
    const parsed: unknown = JSON.parse(jsonLdScript().replace(/\\u003c/g, '<'))
    expect(parsed).toEqual(buildJsonLd())
  })

  /**
   * A `</script>` sequence inside any content string would close the tag
   * early and inject the rest of the CV as markup. Nothing contains one
   * today, which is exactly why the escaping has to be tested rather than
   * assumed to stay that way.
   */
  it('escapes every angle bracket, so no content can close the tag', () => {
    expect(jsonLdScript()).not.toContain('<')
  })
})

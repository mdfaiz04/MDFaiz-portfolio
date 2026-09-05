import { Assistant } from '@/components/sections/Assistant'
import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { Journey } from '@/components/sections/Journey'
import { DataStack } from '@/components/visuals/DataStack'
import { SummitPath } from '@/components/visuals/SummitPath'
import { Projects } from '@/components/sections/Projects'
import { Skills } from '@/components/sections/Skills'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  achievements,
  brandedTechnologies,
  brands,
  counts,
  education,
  experience,
  experienceSince,
  featuredSkills,
  formatRange,
  markWords,
  profile,
  projectCategoryLabels,
  projects,
  skills,
  socials,
  splitDuration,
  splitName,
  visibleSections,
} from '@/content'
import type { Glyph } from '@/lib/visuals/workstation'

/**
 * Which mark orbits the hero scene for each capability area.
 *
 * A presentation mapping keyed by content id, so a new cluster without one
 * simply does not appear rather than breaking the scene. The capabilities
 * themselves are content; which glyph stands for each is a design decision,
 * and this is the assembly layer where the two meet.
 */
const CAPABILITY_GLYPHS: Record<string, Glyph> = {
  'artificial-intelligence': 'chat',
  'backend-engineering': 'code',
  'frontend-engineering': 'terminal',
  'data-and-storage': 'database',
  'cloud-and-devops': 'cloud',
}

/**
 * The page maps over the section registry rather than listing sections, so
 * enabling or reordering one is a content edit.
 *
 * Presentation-ready views are assembled here, in a Server Component, and
 * passed down as plain props. Section components never reach into the
 * content layer themselves — they render what they are given.
 */
export default function HomePage() {
  // Time-dependent, so it is read here rather than on the client, where the
  // server and browser could disagree and trigger a hydration mismatch.
  const worked = splitDuration(experienceSince(new Date()).months)

  /**
   * The headline figures.
   *
   * `id` drives the icon; the numbers come from the counters, which are
   * derived from the content itself. Experience carries a unit because it is
   * the only one whose noun changes — months become years on their own.
   */
  const heroStats = [
    {
      id: 'experience',
      value: worked.value,
      unit: worked.unit,
      label: 'Experience',
    },
    {
      id: 'technologies',
      value: String(counts.technologies),
      label: 'Technologies',
    },
    { id: 'projects', value: String(counts.projects), label: 'Projects' },
    { id: 'placements', value: String(counts.placements), label: 'Placements' },
  ]

  // One orbiting tile per featured capability area.
  const heroGlyphs = featuredSkills.flatMap((cluster) => {
    const glyph = CAPABILITY_GLYPHS[cluster.id]
    return glyph ? [glyph] : []
  })

  const name = splitName(profile.name)

  /**
   * Technology name to logo, built once rather than searched per chip.
   *
   * A technology with no mark is normal — AWS and the AI terms have none —
   * and simply renders with a neutral dot instead.
   */
  const markByTechnology = new Map(
    brands.map((brand) => [
      brand.technology,
      { hex: brand.hex, path: brand.path },
    ]),
  )

  const roles = experience.map((role) => ({
    id: role.id,
    org: role.org,
    role: role.role,
    period: formatRange(role.start, role.end),
    summary: role.summary,
    icon: role.icon,
    highlights: role.highlights,
    impact: role.impact,
    impactLabel: role.impactLabel,
    stack: role.stack.map((name) => ({
      name,
      mark: markByTechnology.get(name),
    })),
  }))

  // Evidence ids are resolved to names here so the Journey component never
  // has to look a project up.
  const projectNames = new Map(projects.map((p) => [p.id, p.name]))

  const clusters = skills.map((cluster) => ({
    id: cluster.id,
    title: cluster.title,
    blurb: cluster.blurb,
    items: cluster.items,
    icon: cluster.icon,
    level: cluster.level,
    evidence: cluster.evidence.flatMap((id) => {
      const name = projectNames.get(id)
      return name ? [{ id, name }] : []
    }),
  }))

  const studies = education.map((entry) => ({
    id: entry.id,
    qualification: entry.qualification,
    field: entry.field,
    institution: entry.institution,
    period: `${entry.startYear}–${entry.endYear}`,
    score: `${entry.score.label} ${entry.score.value}`,
  }))

  const awards = achievements.map((award) => ({
    id: award.id,
    title: award.title,
    event: award.event,
    organisation: award.organisation,
    year: award.year,
    detail: award.detail,
  }))

  const projectViews = projects
    .filter((project) => project.featured)
    .map((project) => ({
      id: project.id,
      name: project.name,
      category: projectCategoryLabels[project.category],
      year: project.year,
      problem: project.problem,
      approach: project.approach,
      outcome: project.outcome,
      stack: project.stack,
      links: project.links.map((link) => ({
        label: link.label,
        href: link.href,
      })),
    }))

  return (
    <main id="main" className="flex flex-1 flex-col">
      {visibleSections.map((section, index) => {
        // The hero is sized to one viewport so the headline, the numbers and
        // the actions are all visible without scrolling. Every other section
        // uses the standard vertical rhythm.
        const isHero = section.id === 'hero'

        return (
          <section
            key={section.id}
            id={section.id}
            className={
              isHero
                ? 'flex min-h-svh scroll-mt-24 items-center px-gutter pt-28 pb-16'
                : 'scroll-mt-24 px-gutter py-section'
            }
          >
            {/* `min-w-0` matters because the hero section is a flex container:
              its child would otherwise take `min-width: auto` and refuse to
              shrink below its content, overflowing narrow screens. */}
            <div className="mx-auto w-full min-w-0 max-w-shell">
              {isHero ? (
                <Hero
                  role={profile.role}
                  tagline={profile.tagline}
                  summary={profile.summary}
                  greeting="Hi, I'm"
                  name={name}
                  taglineHighlights={profile.taglineHighlights}
                  glyphs={heroGlyphs}
                  stats={heroStats}
                  brands={brandedTechnologies}
                  brandsHeading="Technologies I work with"
                  scrollCue="Scroll to explore"
                  assistant={
                    <Assistant
                      heading="Ask me anything"
                      status="Online"
                      placeholder="Type your question..."
                      sendLabel="Send question"
                      opening={`Hi! I'm ${profile.shortName}'s portfolio assistant. Ask me anything about my work, skills, projects, or experience.`}
                    />
                  }
                  primaryAction="View my work"
                  secondaryAction="Get in touch"
                  projectsSectionId="projects"
                  contactSectionId="contact"
                />
              ) : (
                <div className="flex flex-col gap-12">
                  {/*
                    Contact lays out its own header, because the visual beside
                    it has to run the full height of the column. Every other
                    section takes the shared header above its content.
                  */}
                  {['journey', 'skills', 'contact'].includes(
                    section.id,
                  ) ? null : (
                    <SectionHeader
                      index={index}
                      stage={section.eyebrow ?? section.stage}
                      heading={markWords(
                        section.heading ?? section.navLabel,
                        section.headingHighlights ?? [],
                      )}
                      lede={section.lede}
                    />
                  )}

                  {section.id === 'journey' ? (
                    <Journey
                      header={
                        <SectionHeader
                          index={index}
                          stage={section.eyebrow ?? section.stage}
                          heading={markWords(
                            section.heading ?? section.navLabel,
                            section.headingHighlights ?? [],
                          )}
                          lede={section.lede}
                          rule="short"
                        />
                      }
                      illustration={<SummitPath />}
                      roles={roles}
                      studies={studies}
                      awards={awards}
                    />
                  ) : null}

                  {section.id === 'skills' ? (
                    <Skills
                      header={
                        <SectionHeader
                          index={index}
                          stage={section.eyebrow ?? section.stage}
                          heading={markWords(
                            section.heading ?? section.navLabel,
                            section.headingHighlights ?? [],
                          )}
                          lede={section.lede}
                          rule="short"
                        />
                      }
                      illustration={<DataStack />}
                      clusters={clusters}
                      projectsSectionId="projects"
                    />
                  ) : null}

                  {section.id === 'projects' ? (
                    <Projects projects={projectViews} />
                  ) : null}

                  {section.id === 'contact' ? (
                    <Contact
                      header={
                        <SectionHeader
                          index={index}
                          stage={section.eyebrow ?? section.stage}
                          heading={markWords(
                            section.heading ?? section.navLabel,
                            section.headingHighlights ?? [],
                          )}
                          lede={section.lede}
                          rule="short"
                        />
                      }
                      email={profile.email}
                      location={`${profile.location.city}, ${profile.location.region}, ${profile.location.country}`}
                      links={profile.links}
                      marks={socials}
                      emailLabel="Email"
                      locationLabel="Location"
                      status="Always open to new opportunities"
                    />
                  ) : null}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </main>
  )
}

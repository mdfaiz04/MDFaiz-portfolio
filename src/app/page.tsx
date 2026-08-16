import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { Journey } from '@/components/sections/Journey'
import { Projects } from '@/components/sections/Projects'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  achievements,
  counts,
  education,
  experience,
  formatRange,
  profile,
  projectCategoryLabels,
  projects,
  experienceSince,
  skills,
  visibleSections,
} from '@/content'

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
  const tenure = experienceSince(new Date())

  const stats = [
    { label: 'Experience', value: tenure.label },
    { label: 'Projects', value: String(counts.projects) },
    { label: 'Technologies', value: String(counts.technologies) },
    { label: 'Placements', value: String(counts.placements) },
  ]

  const roles = experience.map((role) => ({
    id: role.id,
    org: role.org,
    role: role.role,
    period: formatRange(role.start, role.end),
    summary: role.summary,
    highlights: role.highlights,
    stack: role.stack,
  }))

  // Evidence ids are resolved to names here so the Journey component never
  // has to look a project up.
  const projectNames = new Map(projects.map((p) => [p.id, p.name]))

  const clusters = skills.map((cluster) => ({
    id: cluster.id,
    title: cluster.title,
    blurb: cluster.blurb,
    items: cluster.items,
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
                  stats={stats}
                  projectsSectionId="projects"
                  contactSectionId="contact"
                  assistantSectionId="assistant"
                  assistantPrompt="Ask me anything about my work"
                />
              ) : (
                <div className="flex flex-col gap-12">
                  <SectionHeader
                    index={index}
                    stage={section.stage}
                    heading={section.heading ?? section.navLabel}
                    lede={section.lede}
                  />

                  {section.id === 'journey' ? (
                    <Journey
                      roles={roles}
                      clusters={clusters}
                      studies={studies}
                      awards={awards}
                      projectsSectionId="projects"
                    />
                  ) : null}

                  {section.id === 'projects' ? (
                    <Projects projects={projectViews} />
                  ) : null}

                  {section.id === 'contact' ? (
                    <Contact
                      availability={profile.availability.statement}
                      email={profile.email}
                      location={`${profile.location.city}, ${profile.location.region}, ${profile.location.country}`}
                      links={profile.links}
                    />
                  ) : null}

                  {section.id === 'assistant' ? (
                    <Reveal>
                      <p className="border-rule-soft text-ink-faint max-w-measure rounded-edge border border-dashed p-6 font-mono text-xs tracking-wider">
                        Built in the next phase.
                      </p>
                    </Reveal>
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

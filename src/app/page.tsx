import { Hero } from '@/components/sections/Hero'
import { Reveal } from '@/components/ui/Reveal'
import { counts, experienceSince, profile, visibleSections } from '@/content'

/**
 * The page maps over the section registry rather than listing sections, so
 * enabling or reordering one is a content edit.
 *
 * Journey, Projects, Assistant and Contact land in Phases 4 and 5; their
 * placeholders keep the scroll-spy and nav honest in the meantime.
 */
export default function HomePage() {
  // Time-dependent, so it is read here in a Server Component and passed down
  // as a plain value â€” reading the clock on the client would desynchronise
  // the markup and trigger a hydration mismatch.
  const tenure = experienceSince(new Date())

  const stats = [
    { label: 'Experience', value: tenure.label },
    { label: 'Projects', value: String(counts.projects) },
    { label: 'Technologies', value: String(counts.technologies) },
    { label: 'Placements', value: String(counts.placements) },
  ]

  return (
    <main id="main" className="flex flex-1 flex-col">
      {visibleSections.map((section) => {
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
              {section.id === 'hero' ? (
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
                <Reveal className="flex flex-col gap-3">
                  <p className="text-ink-ghost font-mono text-eyebrow uppercase">
                    {section.stage}
                  </p>
                  <h2 className="font-display text-headline text-ink font-semibold">
                    {section.navLabel}
                  </h2>
                  <div className="border-rule-soft max-w-measure border-t pt-4">
                    <p className="text-ink-faint font-mono text-xs tracking-wider">
                      Built in a later phase.
                    </p>
                  </div>
                </Reveal>
              )}
            </div>
          </section>
        )
      })}
    </main>
  )
}

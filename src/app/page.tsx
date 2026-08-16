import { MagneticButton } from '@/components/ui/MagneticButton'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { counts, experienceSince, profile, visibleSections } from '@/content'

/**
 * Phase 2 placeholder.
 *
 * The hero proper is Phase 3 and the remaining sections are Phase 4. What
 * this proves now is the system: the page maps over the section registry
 * rather than listing sections, every value comes from the content layer,
 * and every colour and timing comes from a token.
 */
export default function HomePage() {
  // Time-dependent, so it is read here in a Server Component and passed down
  // as a plain value — reading the clock on the client would desynchronise
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
      {visibleSections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-24 px-gutter py-section"
        >
          <div className="mx-auto max-w-6xl">
            {section.id === 'hero' ? (
              <Reveal stagger className="flex flex-col gap-6">
                <RevealItem>
                  <p className="text-accent-bright font-mono text-eyebrow uppercase">
                    {profile.role}
                  </p>
                </RevealItem>

                <RevealItem>
                  <h1 className="font-display text-display text-ink max-w-4xl font-extrabold text-balance">
                    {profile.tagline}
                  </h1>
                </RevealItem>

                <RevealItem>
                  <p className="text-ink-muted text-lede max-w-measure">
                    {profile.summary}
                  </p>
                </RevealItem>

                <RevealItem>
                  <dl className="border-rule-soft flex flex-wrap gap-x-10 gap-y-4 border-t pt-6">
                    {stats.map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-1">
                        <dt className="text-ink-faint font-mono text-eyebrow uppercase">
                          {stat.label}
                        </dt>
                        <dd className="text-accent-bright font-mono text-xl font-bold tabular-nums">
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </RevealItem>

                <RevealItem>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <MagneticButton href="#projects">
                      View my work
                    </MagneticButton>
                    <MagneticButton href="#contact" variant="outline">
                      Get in touch
                    </MagneticButton>
                  </div>
                </RevealItem>
              </Reveal>
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
      ))}
    </main>
  )
}

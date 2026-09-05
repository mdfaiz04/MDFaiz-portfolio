import { ArrowUpRight } from 'lucide-react'

import { Chip } from '@/components/ui/Chip'
import { Reveal } from '@/components/ui/Reveal'

type ProjectLink = {
  label: string
  href: string
}

type ProjectView = {
  id: string
  name: string
  category: string
  year: number
  problem: string
  approach: string
  outcome: string
  stack: readonly string[]
  links: readonly ProjectLink[]
}

type ProjectsProps = {
  projects: readonly ProjectView[]
}

/**
 * Proof: four projects, each argued the same way — problem, approach,
 * outcome — so a reader can compare them rather than decode four different
 * formats.
 *
 * Vertical and generous rather than a grid of cards. Four projects presented
 * properly say more than twelve reduced to thumbnails.
 *
 * Entrance is a clip-path wipe, distinct from the timeline's drawn rail and
 * the hero's staggered rise.
 *
 * A Server Component. It used to carry a pointer handler for the light that
 * follows the cursor across a row; that now lives in PointerField, one
 * listener for the whole page, so this file ships no JavaScript at all.
 */
export function Projects({ projects }: ProjectsProps) {
  return (
    <ol className="flex flex-col">
      {projects.map((project, index) => (
        <li key={project.id}>
          <Reveal wipe>
            <article
              data-glow
              className="border-rule-soft border-t py-10 lg:py-14"
            >
              <div className="relative grid gap-6 lg:grid-cols-[7rem_minmax(0,1fr)]">
                <div className="flex flex-row items-baseline gap-3 lg:flex-col lg:gap-2">
                  <span className="text-accent font-mono text-sm tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-ink-ghost font-mono text-xs">
                    {project.year}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-5">
                  <div className="flex flex-col items-start gap-3">
                    <Chip label={project.category} tone="accent" />
                    <h3 className="font-display text-ink text-2xl font-bold tracking-tight text-balance lg:text-3xl">
                      {project.name}
                    </h3>
                  </div>

                  <dl className="grid gap-5 md:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <dt className="text-ink-ghost font-mono text-eyebrow uppercase">
                        Problem
                      </dt>
                      <dd className="text-ink-muted text-sm">
                        {project.problem}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <dt className="text-ink-ghost font-mono text-eyebrow uppercase">
                        Approach
                      </dt>
                      <dd className="text-ink-muted text-sm">
                        {project.approach}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <dt className="text-ink-ghost font-mono text-eyebrow uppercase">
                        Outcome
                      </dt>
                      <dd className="text-ink text-sm">{project.outcome}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {project.stack.map((item) => (
                      <Chip key={item} label={item} />
                    ))}
                  </div>

                  {/* Absent links are the normal case, not an error state:
                      the row simply does not render, leaving no empty gap. */}
                  {project.links.length > 0 ? (
                    <div className="flex flex-wrap gap-4 pt-1">
                      {project.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group text-accent-bright hover:text-accent-glow inline-flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
                        >
                          <span className="link-quiet">{link.label}</span>
                          <ArrowUpRight
                            size={13}
                            aria-hidden="true"
                            className="nudge-out"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ol>
  )
}

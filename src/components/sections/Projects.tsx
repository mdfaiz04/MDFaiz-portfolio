'use client'

import { ArrowUpRight } from 'lucide-react'
import type { CSSProperties, PointerEvent } from 'react'

import { Chip } from '@/components/ui/Chip'
import { Reveal } from '@/components/ui/Reveal'
import { useReducedMotion } from '@/hooks/useReducedMotion'

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
 */
export function Projects({ projects }: ProjectsProps) {
  const reduced = useReducedMotion()

  /**
   * A soft light follows the pointer across the row. Written to CSS custom
   * properties rather than React state — a state update per mouse move would
   * re-render the whole list on every frame.
   */
  function trackPointer(event: PointerEvent<HTMLElement>) {
    if (reduced || event.pointerType !== 'mouse') return

    const card = event.currentTarget
    const box = card.getBoundingClientRect()
    card.style.setProperty('--pointer-x', `${event.clientX - box.left}px`)
    card.style.setProperty('--pointer-y', `${event.clientY - box.top}px`)
  }

  return (
    <ol className="flex flex-col">
      {projects.map((project, index) => (
        <li key={project.id}>
          <Reveal wipe>
            <article
              onPointerMove={trackPointer}
              style={
                { '--pointer-x': '50%', '--pointer-y': '50%' } as CSSProperties
              }
              className="project-card border-rule-soft relative border-t py-10 lg:py-14"
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
                          className="text-accent-bright hover:text-accent-glow inline-flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
                        >
                          {link.label}
                          <ArrowUpRight size={13} aria-hidden="true" />
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

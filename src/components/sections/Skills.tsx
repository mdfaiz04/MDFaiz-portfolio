import {
  ArrowUpRight,
  BrainCircuit,
  Cloud,
  Code2,
  Database,
  Monitor,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Chip } from '@/components/ui/Chip'
import { Reveal } from '@/components/ui/Reveal'

type Cluster = {
  id: string
  title: string
  blurb: string
  icon: string
  items: readonly string[]
  /** Resolved project names, so this component never looks anything up. */
  evidence: readonly { id: string; name: string }[]
}

type SkillsProps = {
  /** The section's own heading block, so this owns the layout beside it. */
  header: ReactNode
  /** The illustration that sits beside the heading. */
  illustration: ReactNode
  clusters: readonly Cluster[]
  projectsSectionId: string
}

/**
 * Which glyph stands for each mark in the content.
 *
 * Keyed by the content's own enum, so a cluster whose mark has no entry
 * degrades to the neutral fallback rather than crashing. A mapping, not a
 * fact — every word on the card arrives as a prop.
 */
const MARKS: Record<string, LucideIcon> = {
  ai: BrainCircuit,
  code: Code2,
  monitor: Monitor,
  database: Database,
  cloud: Cloud,
}

/**
 * What he works with, and the evidence for each claim.
 *
 * Every cluster ends in the projects that demonstrate it, linked, so a
 * visitor can check a capability in one click rather than taking a list of
 * nouns on trust. That is the whole reason this section exists as clusters
 * with evidence rather than as a wall of logos or a row of percentage bars —
 * a self-scored number proves nothing, and a link proves something.
 *
 * A Server Component.
 */
export function Skills({
  header,
  illustration,
  clusters,
  projectsSectionId,
}: SkillsProps) {
  return (
    <div className="flex flex-col gap-12">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        {header}
        <div className="hidden min-w-0 lg:block">{illustration}</div>
      </div>

      <Reveal pop>
        <ul className="grid gap-5 lg:grid-cols-2">
          {clusters.map((cluster, index) => {
            const Mark = MARKS[cluster.icon] ?? Sparkles

            // An odd count leaves a hole in a two-column grid; the last card
            // fills it rather than sitting beside empty space.
            const isLonelyLast =
              index === clusters.length - 1 && clusters.length % 2 === 1

            return (
              <li
                key={cluster.id}
                style={{ '--enter-index': index } as React.CSSProperties}
                className={
                  isLonelyLast
                    ? 'panel panel-interactive hover:border-accent/50 flex flex-col gap-5 p-6 lg:col-span-2'
                    : 'panel panel-interactive hover:border-accent/50 flex flex-col gap-5 p-6'
                }
              >
                <div className="flex items-start gap-5">
                  <span className="border-accent/40 text-accent-bright bg-accent/10 flex size-14 shrink-0 items-center justify-center rounded-pill border">
                    <Mark size={26} aria-hidden="true" />
                  </span>

                  <span className="flex min-w-0 flex-col gap-1.5">
                    <h3 className="font-display text-ink text-xl font-semibold">
                      {cluster.title}
                    </h3>
                    <p className="text-ink-muted max-w-measure text-sm leading-relaxed">
                      {cluster.blurb}
                    </p>
                  </span>
                </div>

                <ul className="border-rule-soft flex flex-wrap gap-2 border-t pt-5">
                  {cluster.items.map((item) => (
                    <li key={item}>
                      <Chip label={item} />
                    </li>
                  ))}
                </ul>

                {cluster.evidence.length > 0 ? (
                  <p className="border-rule-soft mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-4 text-sm">
                    <span className="text-ink-ghost">Proven in</span>

                    {cluster.evidence.map((project) => (
                      <a
                        key={project.id}
                        href={`#${projectsSectionId}`}
                        className="text-accent-bright hover:text-accent-glow font-medium transition-colors duration-fast"
                      >
                        {project.name}
                      </a>
                    ))}

                    <ArrowUpRight
                      size={16}
                      aria-hidden="true"
                      className="text-ink-ghost ml-auto shrink-0"
                    />
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </Reveal>
    </div>
  )
}

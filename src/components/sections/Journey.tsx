'use client'

import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef } from 'react'

import { Chip } from '@/components/ui/Chip'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { spring } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Role = {
  id: string
  org: string
  role: string
  period: string
  summary: string
  highlights: readonly string[]
  stack: readonly string[]
}

type Cluster = {
  id: string
  title: string
  blurb: string
  items: readonly string[]
  /** Resolved project names, so this component never looks anything up. */
  evidence: readonly { id: string; name: string }[]
  level?: number
}

type Study = {
  id: string
  qualification: string
  field?: string
  institution: string
  period: string
  score: string
}

type Award = {
  id: string
  title: string
  event: string
  organisation: string
  year: number
  detail: string
}

type JourneyProps = {
  roles: readonly Role[]
  clusters: readonly Cluster[]
  studies: readonly Study[]
  awards: readonly Award[]
  projectsSectionId: string
}

/**
 * Understanding: the trajectory, the capabilities, and the evidence for them.
 *
 * The timeline rail draws itself as the section scrolls — a scroll-linked
 * motion value driving `scaleY`, so it runs on the compositor rather than
 * re-rendering React on every frame. This is deliberately a different
 * entrance from every other section: the same fade-up applied five times is
 * the clearest tell of a generated page.
 */
export function Journey({
  roles,
  clusters,
  studies,
  awards,
  projectsSectionId,
}: JourneyProps) {
  const reduced = useReducedMotion()
  const railRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ['start 80%', 'end 60%'],
  })

  const smoothed = useSpring(scrollYProgress, spring.weighted)
  // Under reduced motion the rail is simply drawn in full, rather than
  // animating faster — a static alternative, not a quicker one.
  const scaleY = useTransform(smoothed, (value) => (reduced ? 1 : value))

  return (
    <div className="flex flex-col gap-16">
      {/* --- timeline --- */}
      <div ref={railRef} className="relative flex flex-col gap-10 pl-8">
        {/* Track and the drawn line share a position, so the line always
            travels exactly the length of the timeline. */}
        <div className="bg-rule-soft absolute top-2 bottom-2 left-0 w-px" />
        <motion.div
          style={{ scaleY }}
          className="from-accent to-accent-glow absolute top-2 bottom-2 left-0 w-px origin-top bg-gradient-to-b"
        />

        {roles.map((role) => (
          <Reveal
            key={role.id}
            stagger
            className="relative flex flex-col gap-3"
          >
            <span className="border-ground bg-accent absolute top-2 -left-8 size-2.5 -translate-x-1/2 rounded-full border-2" />

            <RevealItem>
              <p className="text-accent-bright font-mono text-eyebrow uppercase">
                {role.period}
              </p>
            </RevealItem>

            <RevealItem>
              <h3 className="font-display text-title text-ink font-semibold">
                {role.role}
                <span className="text-ink-faint"> · {role.org}</span>
              </h3>
            </RevealItem>

            <RevealItem>
              <p className="text-ink-muted max-w-measure">{role.summary}</p>
            </RevealItem>

            <RevealItem>
              <ul className="flex max-w-measure flex-col gap-2 pt-1">
                {role.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="text-ink-faint flex gap-3 text-sm"
                  >
                    <span className="text-accent shrink-0 font-mono">—</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </RevealItem>

            <RevealItem>
              <div className="flex flex-wrap gap-2 pt-2">
                {role.stack.map((item) => (
                  <Chip key={item} label={item} />
                ))}
              </div>
            </RevealItem>
          </Reveal>
        ))}
      </div>

      {/* --- capabilities --- */}
      <Reveal stagger className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {clusters.map((cluster) => (
          <RevealItem key={cluster.id}>
            <article className="border-rule-soft bg-surface/40 flex h-full flex-col gap-3 rounded-edge border p-5">
              <h3 className="font-display text-ink font-semibold">
                {cluster.title}
              </h3>
              <p className="text-ink-faint text-sm">{cluster.blurb}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {cluster.items.map((item) => (
                  <Chip key={item} label={item} />
                ))}
              </div>

              {cluster.evidence.length > 0 ? (
                <p className="border-rule-soft mt-auto flex flex-wrap gap-x-2 gap-y-1 border-t pt-3 font-mono text-xs">
                  <span className="text-ink-ghost">Proven in</span>
                  {cluster.evidence.map((project) => (
                    <a
                      key={project.id}
                      href={`#${projectsSectionId}`}
                      className="text-accent-bright hover:text-accent-glow underline underline-offset-4 transition-colors duration-fast"
                    >
                      {project.name}
                    </a>
                  ))}
                </p>
              ) : null}
            </article>
          </RevealItem>
        ))}
      </Reveal>

      {/* --- education and recognition, deliberately understated --- */}
      <Reveal className="border-rule-soft grid gap-10 border-t pt-10 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-ink-ghost font-mono text-eyebrow uppercase">
            Education
          </h3>
          <ul className="flex flex-col gap-4">
            {studies.map((study) => (
              <li key={study.id} className="flex flex-col gap-1">
                <p className="text-ink text-sm font-semibold">
                  {study.qualification}
                  {study.field ? (
                    <span className="text-ink-faint font-normal">
                      {' '}
                      · {study.field}
                    </span>
                  ) : null}
                </p>
                <p className="text-ink-faint text-sm">{study.institution}</p>
                <p className="text-ink-ghost font-mono text-xs">
                  {study.period} · {study.score}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-ink-ghost font-mono text-eyebrow uppercase">
            Recognition
          </h3>
          <ul className="flex flex-col gap-4">
            {awards.map((award) => (
              <li key={award.id} className="flex flex-col gap-1">
                <p className="text-ink text-sm font-semibold">
                  {award.title}
                  <span className="text-ink-faint font-normal">
                    {' '}
                    · {award.event}
                  </span>
                </p>
                <p className="text-ink-faint text-sm">{award.detail}</p>
                <p className="text-ink-ghost font-mono text-xs">
                  {award.organisation} · {award.year}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}

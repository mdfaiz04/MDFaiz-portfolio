'use client'

import {
  Award,
  Box,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Plane,
  Rocket,
  Search,
  Server,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef } from 'react'

import { BrandMark } from '@/components/ui/BrandMark'
import { Reveal } from '@/components/ui/Reveal'
import { spring } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Impact = {
  icon: string
  text: string
}

type Role = {
  id: string
  org: string
  role: string
  period: string
  summary: string
  icon: string
  highlights: readonly string[]
  impact: readonly Impact[]
  impactLabel?: string
  /** Stack entries already paired with a logo where one exists. */
  stack: readonly { name: string; mark?: { hex: string; path: string } }[]
}

/**
 * Which glyph stands for each mark in the content.
 *
 * Keyed by the content's own enum, so a mark without an entry degrades to the
 * neutral fallback rather than crashing. A mapping, not a fact.
 */
const MARKS: Record<string, LucideIcon> = {
  ai: BrainCircuit,
  rocket: Rocket,
  search: Search,
  server: Server,
  team: Users,
  plane: Plane,
  target: Target,
  cube: Box,
  award: Award,
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
  /** The section's own heading block, so this owns the layout beside it. */
  header: ReactNode
  /** The illustration that sits beside the heading. */
  illustration: ReactNode
  roles: readonly Role[]
  studies: readonly Study[]
  awards: readonly Award[]
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
  header,
  illustration,
  roles,
  studies,
  awards,
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
      {/* --- the heading, and the climb ------------------------------- */}
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        {header}
        <div className="hidden min-w-0 lg:block">{illustration}</div>
      </div>

      {/* --- timeline --- */}
      <div ref={railRef} className="relative flex flex-col gap-8 pl-8">
        {/* Track and the drawn line share a position, so the line always
            travels exactly the length of the timeline. */}
        <div className="bg-rule-soft absolute top-2 bottom-2 left-0 w-px" />
        <motion.div
          style={{ scaleY }}
          className="from-accent to-accent-glow absolute top-2 bottom-2 left-0 w-px origin-top bg-gradient-to-b"
        />

        {roles.map((role) => {
          const RoleMark = MARKS[role.icon] ?? Sparkles

          return (
            <Reveal key={role.id} className="relative">
              <span className="border-ground bg-accent absolute top-8 -left-8 size-3 -translate-x-1/2 rounded-pill border-2" />

              <article className="panel flex flex-col gap-6 p-5 sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
                  {/* --- who and when ---------------------------------- */}
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <span className="tile text-accent-bright flex size-11 shrink-0 items-center justify-center">
                        <CalendarDays size={19} aria-hidden="true" />
                      </span>
                      <span className="text-accent-bright font-mono text-eyebrow uppercase">
                        {role.period}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                      <span className="tile text-accent-bright flex size-20 shrink-0 items-center justify-center">
                        <RoleMark size={34} aria-hidden="true" />
                      </span>

                      <span className="flex min-w-0 flex-col items-start gap-2">
                        <span className="text-ink text-base font-semibold">
                          {role.org}
                        </span>
                        <span className="border-accent/40 text-accent-bright rounded-pill border px-3 py-1 text-xs">
                          {role.role}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* --- what it was ----------------------------------- */}
                  <div className="flex min-w-0 flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-title font-semibold">
                        <span className="text-ink">{role.role}</span>
                        <span className="text-ink-ghost"> · </span>
                        <span className="text-gradient">{role.org}</span>
                      </h3>
                      <p className="text-ink-muted max-w-measure">
                        {role.summary}
                      </p>
                    </div>

                    <div className="border-rule-soft grid gap-6 border-t pt-5 lg:grid-cols-2 lg:gap-8">
                      {/* What was done. */}
                      <div className="flex min-w-0 flex-col gap-3">
                        <h4 className="text-accent-bright font-mono text-eyebrow uppercase">
                          What I did
                        </h4>
                        <ul className="flex flex-col gap-2.5">
                          {role.highlights.map((highlight) => (
                            <li
                              key={highlight}
                              className="text-ink-muted flex gap-2 text-sm leading-snug"
                            >
                              <ChevronRight
                                size={14}
                                aria-hidden="true"
                                className="text-accent mt-0.5 shrink-0"
                              />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* And what came of it. */}
                      {role.impact.length > 0 ? (
                        <div className="flex min-w-0 flex-col gap-3">
                          <h4 className="text-accent-glow font-mono text-eyebrow uppercase">
                            {role.impactLabel ?? 'Impact'}
                          </h4>
                          <ul className="flex flex-col">
                            {role.impact.map((entry) => {
                              const Mark = MARKS[entry.icon] ?? Sparkles

                              return (
                                <li
                                  key={entry.text}
                                  className="border-rule-soft/60 flex items-center gap-3 py-2.5 not-last:border-b"
                                >
                                  <span className="tile text-accent-glow flex size-10 shrink-0 items-center justify-center">
                                    <Mark size={17} aria-hidden="true" />
                                  </span>
                                  <span className="text-ink-muted text-sm leading-snug">
                                    {entry.text}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* --- and what it ran on ----------------------------- */}
                <div className="border-rule-soft flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-start sm:gap-6">
                  <h4 className="text-ink-ghost shrink-0 font-mono text-eyebrow uppercase sm:pt-1.5">
                    Technologies
                  </h4>

                  <ul className="flex flex-wrap gap-2">
                    {role.stack.map((item) => (
                      <li
                        key={item.name}
                        className="border-rule-soft text-ink-muted flex items-center gap-2 rounded-tile border px-3 py-1.5 text-xs"
                      >
                        {item.mark ? (
                          <BrandMark
                            title={item.name}
                            path={item.mark.path}
                            hex={item.mark.hex}
                            size={15}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="bg-accent size-1.5 shrink-0 rounded-pill"
                          />
                        )}
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>

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

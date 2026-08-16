import { ArrowDown, ArrowUpRight, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'

import { NeuralBrain } from '@/components/visuals/NeuralBrain'

type Stat = { label: string; value: string }

type HeroProps = {
  role: string
  tagline: string
  summary: string
  stats: readonly Stat[]
  assistantSectionId: string
  projectsSectionId: string
  contactSectionId: string
  assistantPrompt: string
}

/**
 * The first three seconds.
 *
 * A Server Component: the entrance is CSS, so the hero ships no JavaScript
 * and is fully visible the moment the HTML arrives. An earlier version
 * animated with Framer Motion, which meant the server rendered every element
 * at `opacity: 0` and a visitor on a slow connection saw an empty page until
 * the bundle hydrated. Content should never be hidden behind a script.
 *
 * Only the canvas below is a Client Component, because only the canvas
 * genuinely needs to be.
 *
 * Contains no facts: every string arrives as a prop from the content layer.
 */

/** Ordering of the entrance. Each step is one `--enter-step` after the last. */
const ENTER = {
  eyebrow: 0,
  headline: 1,
  summary: 6,
  stats: 7,
  actions: 8,
  assistant: 9,
  scrollCue: 10,
  brain: 3,
} as const

/** `--enter-index` is a position in the sequence, not a duration. */
function delay(index: number): CSSProperties {
  return { '--enter-index': index } as CSSProperties
}

export function Hero({
  role,
  tagline,
  summary,
  stats,
  assistantSectionId,
  projectsSectionId,
  contactSectionId,
  assistantPrompt,
}: HeroProps) {
  // The headline lands word by word. Splitting here rather than in content
  // keeps the copy a single readable sentence in src/content.
  const words = tagline.split(' ')

  return (
    /* `min-w-0` on both children is load-bearing: grid items default to
       `min-width: auto`, so the canvas wrapper's max width would set the
       track width and push the whole hero wider than a phone screen. */
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-6">
      <div className="flex min-w-0 flex-col gap-5">
        <p
          style={delay(ENTER.eyebrow)}
          className="enter text-accent-bright font-mono text-eyebrow uppercase"
        >
          {role}
        </p>

        <h1 className="font-display text-display text-ink max-w-3xl font-extrabold text-balance">
          {words.map((entry, index) => (
            <span
              // Words repeat in a sentence, so position is part of identity.
              key={`${entry}-${index}`}
              style={delay(ENTER.headline + index)}
              className="enter inline-block whitespace-pre"
            >
              {index === words.length - 1 ? entry : `${entry} `}
            </span>
          ))}
        </h1>

        <p
          style={delay(ENTER.summary)}
          className="enter text-ink-muted text-lede max-w-measure"
        >
          {summary}
        </p>

        <dl
          style={delay(ENTER.stats)}
          className="enter border-rule-soft flex flex-wrap gap-x-10 gap-y-4 border-t pt-6"
        >
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

        <div
          style={delay(ENTER.actions)}
          className="enter flex flex-wrap gap-3 pt-1"
        >
          <a
            href={`#${projectsSectionId}`}
            className="bg-accent hover:bg-accent-bright text-ink inline-flex items-center gap-2 rounded-edge px-6 py-3 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
          >
            View my work
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a
            href={`#${contactSectionId}`}
            className="border-rule text-ink-muted hover:border-accent hover:text-ink inline-flex items-center gap-2 rounded-edge border px-6 py-3 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
          >
            Get in touch
          </a>
        </div>

        {/* Teaser only. One assistant exists, and it lives in its own
            section — meeting the same feature twice reads as a bug. */}
        <a
          href={`#${assistantSectionId}`}
          style={delay(ENTER.assistant)}
          className="enter border-rule-soft bg-surface/50 hover:border-accent group mt-2 inline-flex max-w-measure items-center gap-3 rounded-edge border px-4 py-3 transition-colors duration-fast"
        >
          <Sparkles
            size={15}
            aria-hidden="true"
            className="text-accent-glow shrink-0"
          />
          <span className="text-ink-faint group-hover:text-ink-muted font-mono text-xs transition-colors duration-fast">
            {assistantPrompt}
          </span>
          <ArrowUpRight
            size={14}
            aria-hidden="true"
            className="text-ink-ghost group-hover:text-accent-bright ml-auto shrink-0 transition-colors duration-fast"
          />
        </a>
      </div>

      <div
        style={delay(ENTER.brain)}
        className="enter flex w-full min-w-0 justify-center lg:justify-end"
      >
        <NeuralBrain />
      </div>

      <div
        style={delay(ENTER.scrollCue)}
        className="enter text-ink-ghost col-span-full flex items-center gap-2 pt-4 font-mono text-eyebrow uppercase"
      >
        <ArrowDown size={13} aria-hidden="true" />
        Scroll to explore
      </div>
    </div>
  )
}

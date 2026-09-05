import {
  ArrowUpRight,
  Calendar,
  Code2,
  FolderOpen,
  Mouse,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

import { BrandMark } from '@/components/ui/BrandMark'
import { Reveal } from '@/components/ui/Reveal'
import { Workstation } from '@/components/visuals/Workstation'
import type { Glyph } from '@/lib/visuals/workstation'

/** A headline figure. `unit` is set only where the number needs one. */
type Stat = {
  id: string
  value: string
  unit?: string
  label: string
}

type Brand = {
  technology: string
  hex: string
  path: string
}

type HeroProps = {
  greeting: string
  /** The name, already split: the first word is set in gradient. */
  name: { lead: string; rest: string }
  role: string
  tagline: string
  /** Words of `tagline` to accent, chosen in src/content/profile.ts. */
  taglineHighlights: readonly string[]
  summary: string
  /** One orbiting tile each, in the hero scene. */
  glyphs: readonly Glyph[]
  stats: readonly Stat[]
  brands: readonly Brand[]
  brandsHeading: string
  scrollCue: string
  primaryAction: string
  secondaryAction: string
  projectsSectionId: string
  contactSectionId: string
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
 * Only the canvas is a Client Component, because only the canvas genuinely
 * needs to be.
 *
 * Contains no facts: every string arrives as a prop from the content layer.
 */

/** Ordering of the entrance. Each step is one `--enter-step` after the last. */
const ENTER = {
  greeting: 0,
  name: 1,
  role: 2,
  tagline: 3,
  summary: 4,
  actions: 5,
  scene: 3,
  scrollCue: 6,
} as const

/** `--enter-index` is a position in the sequence, not a duration. */
function delay(index: number): CSSProperties {
  return { '--enter-index': index } as CSSProperties
}

/**
 * Which mark stands for which figure.
 *
 * Keyed by content id, so a new stat without an icon degrades to the neutral
 * fallback rather than crashing. A mapping, not a fact — the words themselves
 * all arrive as props.
 */
const STAT_ICONS: Record<string, LucideIcon> = {
  experience: Calendar,
  technologies: Code2,
  projects: FolderOpen,
  placements: Trophy,
}

/**
 * Compare a word against the highlight list.
 *
 * Punctuation is stripped from both sides so "AI." in the sentence matches
 * "AI." in content whether or not the full stop was typed, and casing never
 * matters.
 */
function normaliseWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9+#]/g, '')
}

export function Hero({
  greeting,
  name,
  role,
  tagline,
  taglineHighlights,
  summary,
  glyphs,
  stats,
  brands,
  brandsHeading,
  scrollCue,
  primaryAction,
  secondaryAction,
  projectsSectionId,
  contactSectionId,
}: HeroProps) {
  const wanted = taglineHighlights.map(normaliseWord)
  const spoken = tagline.split(' ')

  // Which words are picked out, in the order they appear. Derived as a list
  // first so the tone can be a pure lookup: alternating by position needs a
  // running count, and a counter mutated inside a render is a bug waiting
  // for a re-render to happen.
  const picked = spoken
    .map((word, index) => (wanted.includes(normaliseWord(word)) ? index : -1))
    .filter((index) => index >= 0)

  // Highlighted words alternate between the two accent tones by position, so
  // the pairing is a rule rather than a decision written down per word.
  const words = spoken.map((word, index) => {
    const position = picked.indexOf(index)
    return { word, isHighlight: position >= 0, tone: position % 2 }
  })

  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        {/* --- the pitch ------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <p
            style={delay(ENTER.greeting)}
            className="enter text-accent-bright text-sm font-medium"
          >
            {greeting}
          </p>

          <h1
            style={delay(ENTER.name)}
            className="enter font-display text-hero font-extrabold"
          >
            <span className="text-gradient">{name.lead}</span>{' '}
            <span className="text-ink">{name.rest}</span>
          </h1>

          <p
            style={delay(ENTER.role)}
            className="enter font-display text-accent-bright text-hero-role font-semibold"
          >
            {role}
          </p>

          <p
            style={delay(ENTER.tagline)}
            className="enter font-display text-ink text-hero-line font-bold text-balance"
          >
            {words.map((entry, index) => (
              <span
                // Words repeat in a sentence, so position is part of identity.
                key={`${entry.word}-${index}`}
                className={
                  entry.isHighlight
                    ? entry.tone === 0
                      ? 'text-accent-glow'
                      : 'text-accent-bright'
                    : undefined
                }
              >
                {index === words.length - 1 ? entry.word : `${entry.word} `}
              </span>
            ))}
          </p>

          <p
            style={delay(ENTER.summary)}
            className="enter text-ink-muted max-w-measure text-base leading-relaxed"
          >
            {summary}
          </p>

          <div
            style={delay(ENTER.actions)}
            className="enter flex flex-wrap items-center gap-3 pt-2"
          >
            <a
              href={`#${projectsSectionId}`}
              className="button-primary text-ink inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold hover:-translate-y-0.5"
            >
              {primaryAction}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a
              href={`#${contactSectionId}`}
              className="border-rule text-ink-muted hover:border-accent hover:text-ink inline-flex items-center gap-2 rounded-tile border px-6 py-3 text-sm font-semibold transition-colors duration-fast"
            >
              {secondaryAction}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* --- the object ------------------------------------------------ */}
        <div
          style={delay(ENTER.scene)}
          /* Third on a phone, second on a desktop. Stacked, the scene is
             tall and decorative, and putting it before the assistant buries
             the one interactive thing on the page — which is the reason it
             moved out of the footer in the first place. */
          className="enter flex w-full min-w-0 justify-center lg:col-span-7"
        >
          <Workstation glyphs={glyphs} />
        </div>
      </div>

      {/* --- the numbers -------------------------------------------------- */}
      {/*
        A list, not a <dl>. A description list may only contain <dt>/<dd>
        pairs — optionally grouped in a bare <div> — so the icon beside each
        figure has nowhere legal to sit inside one. Invalid markup that a
        screen reader has to guess at is worse than plainer markup it can
        read straight through.
      */}
      <Reveal pop>
        <ul
          data-glow
          className="panel grid grid-cols-2 overflow-hidden lg:grid-cols-4"
        >
          {stats.map((stat, index) => {
            const Icon = STAT_ICONS[stat.id] ?? Sparkles

            return (
              <li
                key={stat.id}
                style={delay(index)}
                className="rise border-rule/60 flex items-center gap-4 px-5 py-5 lg:border-l lg:first:border-l-0"
              >
                <span className="tile text-accent-bright flex size-11 shrink-0 items-center justify-center">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-ink flex items-baseline gap-1 text-2xl font-bold tabular-nums">
                    {stat.value}
                    {stat.unit ? (
                      <span className="text-ink-faint text-sm font-medium">
                        {stat.unit}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-ink-faint truncate text-xs">
                    {stat.label}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </Reveal>

      {/* --- the toolkit -------------------------------------------------- */}
      <section
        aria-label={brandsHeading}
        data-glow
        className="panel flex flex-col gap-5 px-6 py-6"
      >
        <h2 className="text-ink text-base font-semibold">{brandsHeading}</h2>

        <Reveal pop>
          <ul className="flex flex-wrap items-start gap-x-8 gap-y-5 sm:gap-x-12">
            {brands.map((brand, index) => (
              <li
                key={brand.technology}
                style={delay(index)}
                className="rise flex w-16 flex-col items-center gap-2 text-center"
              >
                <BrandMark
                  title={brand.technology}
                  path={brand.path}
                  hex={brand.hex}
                />
                <span className="text-ink-faint text-xs">
                  {brand.technology}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <p
        style={delay(ENTER.scrollCue)}
        className="enter text-ink-ghost flex flex-col items-center gap-2 text-xs"
      >
        {scrollCue}
        <Mouse size={16} aria-hidden="true" className="animate-bounce" />
      </p>
    </div>
  )
}

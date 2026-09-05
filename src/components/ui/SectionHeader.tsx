import { Reveal } from '@/components/ui/Reveal'

type SectionHeaderProps = {
  /** The journey stage this section serves — real information, not decoration. */
  stage: string
  /** Already split into words, with the accented ones marked. */
  heading: readonly { word: string; isHighlight: boolean }[]
  lede?: string
  /** Position in the story, shown as a two-digit index. */
  index: number
  /**
   * A rule across the full column, or a short mark under the label.
   *
   * Full is the default so every existing section is untouched; the short
   * mark is for a section laid out in two columns, where a rule running the
   * width of one of them reads as a broken divider rather than a heading.
   */
  rule?: 'full' | 'short'
}

/**
 * Shared section opening. The numbering is honest: sections genuinely are a
 * sequence, and the visitor is meant to read them in order.
 *
 * The heading arrives pre-split rather than as a string, so the matching of
 * accented words happens once, in the content layer, next to the words it
 * matches — and this file stays free of any rule about which ones they are.
 */
export function SectionHeader({
  stage,
  heading,
  lede,
  index,
  rule = 'full',
}: SectionHeaderProps) {
  return (
    <Reveal className="flex flex-col gap-4">
      <div
        className={
          rule === 'full'
            ? 'border-rule-soft flex items-baseline gap-4 border-b pb-4'
            : 'flex items-baseline gap-4'
        }
      >
        <span className="text-accent font-mono text-xs tabular-nums">
          {String(index).padStart(2, '0')}
        </span>
        <span className="text-ink-ghost font-mono text-eyebrow uppercase">
          {stage}
        </span>
      </div>

      {rule === 'short' ? (
        <span aria-hidden="true" className="flex items-center gap-2">
          <span className="bg-accent h-0.5 w-20 rounded-pill" />
          <span className="bg-rule-soft h-px w-28" />
        </span>
      ) : null}

      <h2 className="font-display text-headline text-ink max-w-3xl font-bold text-balance">
        {heading.map((entry, position) => (
          <span
            // Words repeat in a sentence, so position is part of identity.
            key={`${entry.word}-${position}`}
            className={entry.isHighlight ? 'text-gradient' : undefined}
          >
            {position === heading.length - 1 ? entry.word : `${entry.word} `}
          </span>
        ))}
      </h2>

      {lede ? (
        <p className="text-ink-muted max-w-measure text-lede">{lede}</p>
      ) : null}
    </Reveal>
  )
}

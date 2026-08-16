import { Reveal } from '@/components/ui/Reveal'

type SectionHeaderProps = {
  /** The journey stage this section serves — real information, not decoration. */
  stage: string
  heading: string
  lede?: string
  /** Position in the story, shown as a two-digit index. */
  index: number
}

/**
 * Shared section opening. The numbering is honest: sections genuinely are a
 * sequence, and the visitor is meant to read them in order.
 */
export function SectionHeader({
  stage,
  heading,
  lede,
  index,
}: SectionHeaderProps) {
  return (
    <Reveal className="flex flex-col gap-4">
      <div className="border-rule-soft flex items-baseline gap-4 border-b pb-4">
        <span className="text-accent font-mono text-xs tabular-nums">
          {String(index).padStart(2, '0')}
        </span>
        <span className="text-ink-ghost font-mono text-eyebrow uppercase">
          {stage}
        </span>
      </div>

      <h2 className="font-display text-headline text-ink max-w-3xl font-bold text-balance">
        {heading}
      </h2>

      {lede ? (
        <p className="text-ink-muted max-w-measure text-lede">{lede}</p>
      ) : null}
    </Reveal>
  )
}

type ChipProps = {
  label: string
  /** Accent chips mark the primary classification; plain ones list detail. */
  tone?: 'plain' | 'accent'
}

/**
 * A single tag. Server Component — it has no behaviour, so it ships no JS.
 * Carries no content of its own; the label always arrives as a prop.
 */
export function Chip({ label, tone = 'plain' }: ChipProps) {
  const skin =
    tone === 'accent'
      ? 'border-accent/40 text-accent-bright'
      : 'border-rule text-ink-faint'

  return (
    <span
      className={`rounded-edge border px-2.5 py-1 font-mono text-xs tracking-wider ${skin}`}
    >
      {label}
    </span>
  )
}

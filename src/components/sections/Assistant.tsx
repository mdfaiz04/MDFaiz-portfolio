'use client'

import { ArrowRight, ArrowUpRight, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Chip } from '@/components/ui/Chip'
import { typewriter } from '@/config/motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { answer } from '@/lib/assistant/answer'
import { suggestions } from '@/lib/assistant/suggest'
import type { Answer } from '@/lib/assistant/types'

type Turn =
  | { id: string; role: 'visitor'; text: string }
  | { id: string; role: 'assistant'; answer: Answer }

type AssistantProps = {
  /** Every string arrives as a prop — this component states no fact (R1). */
  heading: string
  status: string
  placeholder: string
  opening: string
  sendLabel: string
  /** Shown in the empty transcript, before anything has been asked. */
  emptyHint: string
}

/** How many characters of the current text block are shown. */
type Progress = { block: number; char: number }

const COMPLETE: Progress = { block: Number.MAX_SAFE_INTEGER, char: 0 }

/**
 * The portfolio assistant.
 *
 * Runs entirely in the visitor's browser: no API, no key, no server, and
 * therefore no cost and nothing to rate-limit. Answers are composed from the
 * same content layer the rest of the page renders, so it is structurally
 * incapable of inventing a fact.
 *
 * The considered pause and the typewriter are the only theatre here, and they
 * are honest ones — the engine really does answer in under a millisecond, and
 * text appearing instantly reads as canned rather than considered.
 */
export function Assistant({
  heading,
  status,
  placeholder,
  opening,
  sendLabel,
  emptyHint,
}: AssistantProps) {
  const reduced = useReducedMotion()
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [progress, setProgress] = useState<Progress>(COMPLETE)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const latest = turns[turns.length - 1]
  const isTyping =
    latest?.role === 'assistant' && progress.block < latest.answer.blocks.length

  function ask(question: string) {
    const trimmed = question.trim()
    if (trimmed === '' || thinking) return

    setDraft('')
    setTurns((current) => [
      ...current,
      { id: `q-${current.length}`, role: 'visitor', text: trimmed },
    ])
    setThinking(true)
  }

  // The deliberate pause. Kept in one place so its length is a token, and
  // skipped entirely under reduced motion.
  useEffect(() => {
    if (!thinking) return

    const question = [...turns]
      .reverse()
      .find((turn) => turn.role === 'visitor')
    if (question?.role !== 'visitor') return

    const reply = answer(question.text)
    const delay = reduced ? 0 : typewriter.thinkingPause

    const timer = window.setTimeout(() => {
      setTurns((current) => [
        ...current,
        { id: `a-${current.length}`, role: 'assistant', answer: reply },
      ])
      setProgress(reduced ? COMPLETE : { block: 0, char: 0 })
      setThinking(false)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [thinking, turns, reduced])

  // Typewriter. Prose reveals by character and an explanation reveals a line
  // at a time; everything else lands whole, because there is nothing to
  // "type" about a chip row.
  useEffect(() => {
    if (latest?.role !== 'assistant') return
    if (progress.block >= latest.answer.blocks.length) return

    const block = latest.answer.blocks[progress.block]
    if (!block) return

    const steps =
      block.type === 'text'
        ? block.value.length
        : block.type === 'points'
          ? block.values.length
          : 0

    if (progress.char >= steps) {
      const timer = window.setTimeout(
        () => setProgress({ block: progress.block + 1, char: 0 }),
        typewriter.charDelay * (block.type === 'text' ? 6 : 4),
      )
      return () => window.clearTimeout(timer)
    }

    const isProse = block.type === 'text'

    const timer = window.setTimeout(
      () => {
        setProgress({
          block: progress.block,
          char: progress.char + (isProse ? 4 : 1),
        })
      },
      typewriter.charDelay * (isProse ? 1 : 10),
    )

    return () => window.clearTimeout(timer)
  }, [latest, progress])

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [turns, progress, reduced])

  const openingSuggestions = suggestions.slice(0, 5)

  return (
    <div className="panel grid overflow-hidden lg:grid-cols-[21rem_minmax(0,1fr)]">
      {/*
        Two panes rather than one column.

        In a narrow box the prompts pushed the answer out of sight and the
        answer scrolled in a letterbox — the reader could see either what to
        ask or what was said, never both. Side by side, the prompts stay put
        while the conversation runs beside them, which is how a person
        actually uses this: read an answer, glance left, ask the next thing.
      */}
      <aside className="border-rule-soft flex flex-col gap-6 border-b p-6 lg:border-r lg:border-b-0 lg:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink flex min-w-0 items-center gap-2.5 text-lg font-semibold">
            <Sparkles
              size={20}
              aria-hidden="true"
              className="text-accent-glow shrink-0"
            />
            <span className="truncate">{heading}</span>
          </span>

          <span className="text-ink-faint flex shrink-0 items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="bg-positive size-2 rounded-pill"
            />
            {status}
          </span>
        </div>

        <p className="text-ink-muted text-base leading-relaxed">{opening}</p>

        <div className="flex flex-col gap-2.5">
          {openingSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => ask(suggestion.question)}
              disabled={thinking || isTyping}
              className="chip-interactive border-rule-soft/70 text-ink-muted hover:text-ink group flex items-center justify-between gap-3 rounded-tile border px-4 py-3 text-left text-sm leading-snug disabled:opacity-40"
            >
              {suggestion.question}
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="nudge text-ink-ghost group-hover:text-accent-bright shrink-0 transition-colors duration-fast"
              />
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div
          ref={transcriptRef}
          aria-live="polite"
          className="flex min-h-96 flex-1 flex-col gap-5 overflow-y-auto p-6 lg:p-7"
        >
          {turns.length === 0 ? (
            <p className="text-ink-ghost m-auto max-w-measure text-center text-base">
              {emptyHint}
            </p>
          ) : null}

          {turns.map((turn) =>
            turn.role === 'visitor' ? (
              <p
                key={turn.id}
                className="bg-accent-solid/25 border-accent/30 text-ink w-fit max-w-measure self-end rounded-tile border px-4 py-2.5 text-base"
              >
                {turn.text}
              </p>
            ) : (
              <AnswerView
                key={turn.id}
                answer={turn.answer}
                progress={turn === latest ? progress : COMPLETE}
              />
            ),
          )}

          {thinking ? (
            <p className="text-ink-ghost flex gap-1.5 font-mono text-sm">
              <span className="dot-pulse">•</span>
              <span className="dot-pulse dot-pulse-2">•</span>
              <span className="dot-pulse dot-pulse-3">•</span>
            </p>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            ask(draft)
          }}
          className="border-rule-soft flex items-center gap-3 border-t p-4 lg:p-5"
        >
          <label htmlFor="assistant-input" className="sr-only">
            {placeholder}
          </label>
          <input
            id="assistant-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className="border-rule-soft/70 bg-surface/40 text-ink placeholder:text-ink-ghost focus:border-accent/60 min-w-0 flex-1 rounded-tile border px-4 py-3 text-base outline-none"
          />
          <button
            type="submit"
            aria-label={sendLabel}
            disabled={draft.trim() === '' || thinking}
            className="button-primary text-ink inline-flex size-12 shrink-0 items-center justify-center disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  )
}

/** Renders answer blocks, revealing progressively as the typewriter advances. */
function AnswerView({
  answer: reply,
  progress,
}: {
  answer: Answer
  progress: Progress
}) {
  return (
    <div className="flex flex-col gap-3">
      {reply.blocks.map((block, index) => {
        if (index > progress.block) return null

        const key = `${block.type}-${index}`

        if (block.type === 'text') {
          const shown =
            index < progress.block
              ? block.value
              : block.value.slice(0, progress.char)

          return (
            <p
              key={key}
              className="text-ink-muted max-w-measure text-base leading-relaxed"
            >
              {shown}
            </p>
          )
        }

        if (block.type === 'points') {
          const shown =
            index < progress.block ? block.values.length : progress.char

          return (
            <ul
              key={key}
              className="border-rule-soft flex flex-col gap-3 border-l pl-4"
            >
              {block.values.slice(0, shown).map((point, position) => (
                <li
                  key={point.label ?? `point-${position}`}
                  className="enter flex flex-col gap-1"
                >
                  {point.label ? (
                    <span className="text-accent-bright font-mono text-xs tracking-wider">
                      {point.label}
                    </span>
                  ) : null}
                  <span className="text-ink-muted text-sm">{point.value}</span>
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'note') {
          return (
            <p
              key={key}
              className="border-accent/30 text-ink-ghost border-l-2 pl-3 font-mono text-xs"
            >
              {block.value}
            </p>
          )
        }

        if (block.type === 'chips') {
          return (
            <div key={key} className="flex flex-wrap gap-2">
              {block.values.map((value) => (
                <Chip key={value} label={value} />
              ))}
            </div>
          )
        }

        if (block.type === 'jump') {
          return (
            <a
              key={key}
              href={`#${block.sectionId}`}
              className="text-accent-bright hover:text-accent-glow inline-flex w-fit items-center gap-1.5 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
            >
              {block.label}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          )
        }

        return (
          <a
            key={key}
            href={block.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-bright hover:text-accent-glow inline-flex w-fit items-center gap-1.5 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
          >
            {block.label}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        )
      })}
    </div>
  )
}

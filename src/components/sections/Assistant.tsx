'use client'

import { ArrowUpRight, CornerDownLeft, Sparkles } from 'lucide-react'
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
  /** Placeholder and opening line come from content, never from markup. */
  placeholder: string
  opening: string
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
export function Assistant({ placeholder, opening }: AssistantProps) {
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

  // Typewriter. Text blocks reveal by character; everything else appears
  // whole, because there is nothing to "type" about a chip row.
  useEffect(() => {
    if (latest?.role !== 'assistant') return
    if (progress.block >= latest.answer.blocks.length) return

    const block = latest.answer.blocks[progress.block]
    if (!block) return

    if (block.type !== 'text') {
      const timer = window.setTimeout(
        () => setProgress({ block: progress.block + 1, char: 0 }),
        typewriter.charDelay * 4,
      )
      return () => window.clearTimeout(timer)
    }

    if (progress.char >= block.value.length) {
      const timer = window.setTimeout(
        () => setProgress({ block: progress.block + 1, char: 0 }),
        typewriter.charDelay * 6,
      )
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setProgress({ block: progress.block, char: progress.char + 4 })
    }, typewriter.charDelay)

    return () => window.clearTimeout(timer)
  }, [latest, progress])

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [turns, progress, reduced])

  const openingSuggestions = suggestions.slice(0, 4)

  return (
    <div className="flex flex-col gap-5">
      <div className="border-rule-soft bg-surface/40 flex flex-col rounded-edge border">
        <div
          ref={transcriptRef}
          aria-live="polite"
          className="flex max-h-96 flex-col gap-5 overflow-y-auto p-5"
        >
          <p className="text-ink-faint flex items-start gap-3 text-sm">
            <Sparkles
              size={15}
              aria-hidden="true"
              className="text-accent-glow mt-0.5 shrink-0"
            />
            {opening}
          </p>

          {turns.map((turn) =>
            turn.role === 'visitor' ? (
              <p
                key={turn.id}
                className="border-accent/50 text-ink self-end border-r-2 pr-3 text-right text-sm"
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
            <p className="text-ink-ghost flex gap-1 font-mono text-xs">
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
          className="border-rule-soft flex items-center gap-3 border-t p-3"
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
            className="text-ink placeholder:text-ink-ghost min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-sm outline-none"
          />
          <button
            type="submit"
            disabled={draft.trim() === '' || thinking}
            className="bg-accent hover:bg-accent-bright text-ink inline-flex shrink-0 items-center gap-2 rounded-edge px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors duration-fast disabled:opacity-40"
          >
            Ask
            <CornerDownLeft size={13} aria-hidden="true" />
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {openingSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => ask(suggestion.question)}
            disabled={thinking || isTyping}
            className="border-rule text-ink-faint hover:border-accent hover:text-ink rounded-edge border px-3 py-1.5 text-left font-mono text-xs transition-colors duration-fast disabled:opacity-40"
          >
            {suggestion.question}
          </button>
        ))}
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
            <p key={key} className="text-ink-muted text-sm">
              {shown}
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

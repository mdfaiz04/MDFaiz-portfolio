import { ArrowUpRight, ExternalLink, Mail, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandMark } from '@/components/ui/BrandMark'
import { Reveal } from '@/components/ui/Reveal'
import { FlightPaths } from '@/components/visuals/FlightPaths'

type ContactLink = {
  label: string
  href: string
  kind: string
}

type SocialMark = {
  host: string
  title: string
  hex: string
  path: string
}

type ContactProps = {
  /** The section's own heading block, passed in so this owns the layout. */
  header: ReactNode
  email: string
  location: string
  links: readonly ContactLink[]
  /** Logos, matched to a link by the host of its URL. */
  marks: readonly SocialMark[]
  emailLabel: string
  locationLabel: string
  status: string
}

/**
 * Connection: one statement of availability, the address, and the places
 * worth following. No contact form — a form is friction and a spam target
 * when a mail link does the same job.
 *
 * The section owns its own layout rather than sitting under the shared
 * section header, because the visual beside it has to run the full height of
 * everything on the left.
 *
 * A Server Component; only the canvas runs on the client.
 */

/** Match a link to its logo by URL host, never by its label. */
function markFor(
  href: string,
  marks: readonly SocialMark[],
): SocialMark | undefined {
  let host: string

  try {
    host = new URL(href).hostname
  } catch {
    // A mailto: has no hostname, which is not an error — it simply has no
    // brand mark and falls back to the envelope.
    return undefined
  }

  return marks.find(
    (mark) => host === mark.host || host.endsWith(`.${mark.host}`),
  )
}

export function Contact({
  header,
  email,
  location,
  links,
  marks,
  emailLabel,
  locationLabel,
  status,
}: ContactProps) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
      <div className="flex min-w-0 flex-col gap-8">
        {header}

        <Reveal pop>
          <div className="flex flex-col gap-3">
            {/* --- the address ------------------------------------------ */}
            <a
              href={`mailto:${email}`}
              style={{ '--enter-index': 0 } as React.CSSProperties}
              className="panel panel-interactive hover:border-accent/60 group flex items-center gap-4 p-4 hover:-translate-y-0.5"
            >
              <span className="tile text-accent-bright flex size-12 shrink-0 items-center justify-center rounded-pill">
                <Mail size={20} aria-hidden="true" />
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-accent-bright font-mono text-eyebrow uppercase">
                  {emailLabel}
                </span>
                <span className="text-ink truncate text-lg font-semibold">
                  {email}
                </span>
              </span>

              <span
                aria-hidden="true"
                className="border-rule-soft text-ink-faint group-hover:text-accent-bright ml-auto flex size-9 shrink-0 items-center justify-center rounded-tile border transition-colors duration-fast"
              >
                <ExternalLink size={15} />
              </span>
            </a>

            {/* --- where he is ------------------------------------------ */}
            <div
              style={{ '--enter-index': 1 } as React.CSSProperties}
              className="panel flex items-center gap-4 p-4"
            >
              <span className="tile text-accent-glow flex size-12 shrink-0 items-center justify-center rounded-pill">
                <MapPin size={20} aria-hidden="true" />
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-accent-bright font-mono text-eyebrow uppercase">
                  {locationLabel}
                </span>
                <span className="text-ink truncate text-lg font-semibold">
                  {location}
                </span>
              </span>
            </div>
          </div>
        </Reveal>

        {/* --- where to find him ---------------------------------------- */}
        <Reveal pop>
          <ul className="border-rule-soft flex flex-wrap gap-3 border-t pt-8">
            {links.map((link, index) => {
              const mark = markFor(link.href, marks)
              const isMail = link.kind === 'email'

              return (
                <li
                  key={link.href}
                  style={{ '--enter-index': index } as React.CSSProperties}
                >
                  <a
                    href={link.href}
                    target={isMail ? undefined : '_blank'}
                    rel={isMail ? undefined : 'noopener noreferrer'}
                    className="panel panel-interactive text-ink hover:border-accent/60 group inline-flex items-center gap-2.5 px-4 py-3 text-sm font-semibold hover:-translate-y-0.5"
                  >
                    {mark ? (
                      <BrandMark
                        title={mark.title}
                        path={mark.path}
                        hex={mark.hex}
                        size={18}
                      />
                    ) : (
                      <Mail
                        size={18}
                        aria-hidden="true"
                        className="text-accent-bright shrink-0"
                      />
                    )}
                    {link.label}
                    <ArrowUpRight
                      size={15}
                      aria-hidden="true"
                      className="text-ink-ghost group-hover:text-accent-bright shrink-0 transition-colors duration-fast"
                    />
                  </a>
                </li>
              )
            })}
          </ul>
        </Reveal>

        {/* --- and whether he is looking -------------------------------- */}
        <Reveal>
          <p className="text-ink-faint flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="bg-positive size-2 shrink-0 rounded-pill"
            />
            {status}
          </p>
        </Reveal>
      </div>

      <div className="min-w-0">
        <FlightPaths />
      </div>
    </div>
  )
}

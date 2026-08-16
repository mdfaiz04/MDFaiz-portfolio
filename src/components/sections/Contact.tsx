import {
  ArrowUpRight,
  ExternalLink,
  FileText,
  Globe,
  Link as LinkIcon,
  Mail,
  MapPin,
  type LucideIcon,
} from 'lucide-react'

import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { SignalWave } from '@/components/visuals/SignalWave'

type ContactLink = {
  label: string
  href: string
  kind: string
}

type ContactProps = {
  availability: string
  email: string
  location: string
  links: readonly ContactLink[]
}

/**
 * Icons are chosen by the link's `kind`, which is part of the content schema,
 * rather than by its label, which is free text. Adding a link stays a content
 * edit, and a renaming never silently drops the icon.
 *
 * Brand marks are deliberately absent: lucide removed them in v1, and a
 * generic outbound icon is better than shipping a second icon dependency for
 * two logos.
 */
const ICONS: Record<string, LucideIcon> = {
  email: Mail,
  social: ExternalLink,
  repo: LinkIcon,
  live: Globe,
  doc: FileText,
}

/**
 * Connection: one statement of availability, the address, and the two places
 * worth following. No contact form — a form is friction and a spam target
 * when a mail link does the same job.
 *
 * A Server Component; only the wave beneath it runs on the client.
 */
export function Contact({
  availability,
  email,
  location,
  links,
}: ContactProps) {
  return (
    <div className="flex flex-col gap-10">
      <Reveal stagger className="flex flex-col gap-6">
        <RevealItem>
          <a
            href={`mailto:${email}`}
            className="font-display text-ink hover:text-accent-bright inline-flex items-center gap-3 text-2xl font-bold tracking-tight transition-colors duration-fast sm:text-4xl"
          >
            {email}
            <ArrowUpRight className="shrink-0" size={28} aria-hidden="true" />
          </a>
        </RevealItem>

        <RevealItem>
          <p className="text-ink-muted max-w-measure text-lede">
            {availability}
          </p>
        </RevealItem>

        <RevealItem>
          <p className="text-ink-faint flex items-center gap-2 font-mono text-xs tracking-wider">
            <MapPin size={14} aria-hidden="true" />
            {location}
          </p>
        </RevealItem>

        <RevealItem>
          <ul className="border-rule-soft flex flex-wrap gap-3 border-t pt-6">
            {links.map((link) => {
              const Icon = ICONS[link.kind] ?? ArrowUpRight
              const isMail = link.kind === 'email'

              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={isMail ? undefined : '_blank'}
                    rel={isMail ? undefined : 'noopener noreferrer'}
                    className="border-rule text-ink-muted hover:border-accent hover:text-ink inline-flex items-center gap-2 rounded-edge border px-4 py-2.5 font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
                  >
                    <Icon size={15} aria-hidden="true" />
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </RevealItem>
      </Reveal>

      <SignalWave />
    </div>
  )
}

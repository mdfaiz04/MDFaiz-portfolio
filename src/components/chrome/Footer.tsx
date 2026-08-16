import type { Link as ContentLink } from '@/content'

type FooterProps = {
  /** From the section registry â€” the same source the nav uses. */
  items: readonly { id: string; navLabel: string }[]
  links: readonly ContentLink[]
  owner: string
  year: number
}

/**
 * Footer links are generated from the same registry as the nav, so the two
 * can never disagree about which sections exist.
 *
 * A Server Component: it has no interaction, so it ships no JavaScript.
 */
export function Footer({ items, links, owner, year }: FooterProps) {
  return (
    <footer className="border-rule-soft relative z-10 border-t">
      <div className="mx-auto flex max-w-shell flex-col gap-6 px-gutter py-10 md:flex-row md:items-center md:justify-between">
        <p className="text-ink-ghost font-mono text-xs tracking-wider">
          Â© {year} {owner}
        </p>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-ink-faint hover:text-ink font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
                >
                  {item.navLabel}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target={link.kind === 'email' ? undefined : '_blank'}
                rel={link.kind === 'email' ? undefined : 'noopener noreferrer'}
                className="text-ink-faint hover:text-accent-bright font-mono text-xs tracking-widest uppercase transition-colors duration-fast"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

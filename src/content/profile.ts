import type { Profile } from './schema'

/**
 * Every fact here comes from the CV. Nothing is inferred, rounded up, or
 * borrowed from the design mockup — the mockup's figures were placeholder.
 */
export const profile = {
  name: 'MD Faiz',
  shortName: 'Faiz',
  role: 'AI & Software Engineer',
  tagline: 'Building intelligent systems with code and AI.',
  /** The two words the hero picks out of the line above. */
  taglineHighlights: ['code', 'AI.'],
  summary:
    'Computer Science Engineering student specialising in Artificial Intelligence. I build AI-powered applications with large language models, agentic systems, and retrieval-augmented generation, and the backend services that carry them to production.',
  location: {
    city: 'Ballari',
    region: 'Karnataka',
    country: 'India',
  },
  email: 'faiz31807@gmail.com',
  // Present in the CV, deliberately not published — see schema note.
  phone: '+91 7892633149',
  availability: {
    open: true,
    statement:
      'Open to internships and graduate roles in AI and backend engineering.',
  },
  links: [
    {
      label: 'GitHub',
      href: 'https://github.com/mdfaiz04',
      kind: 'social',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/md-faiz-5a768b2a1',
      kind: 'social',
    },
    {
      label: 'Email',
      href: 'mailto:faiz31807@gmail.com',
      kind: 'email',
    },
  ],
} satisfies Profile

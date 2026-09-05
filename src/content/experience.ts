import type { Experience } from './schema'

/**
 * Real roles, real dates, ordered most recent first.
 * `end: null` means current — the UI renders it as "Present", the duration
 * calculation treats it as ongoing.
 */
export const experience = [
  {
    id: 'metawurks-ai',
    org: 'Metawurks AI',
    role: 'Technical Intern',
    kind: 'internship',
    start: '2026-04',
    end: null,
    summary:
      'Building production AI applications and the backend services behind them.',
    icon: 'ai',
    impactLabel: 'Impact',
    /**
     * Each line restates a highlight below as an outcome. Nothing here claims
     * a result the CV does not — no user numbers, no percentages, no "improved
     * X by Y". Those would be the easiest thing in the world to write and the
     * hardest to defend in an interview.
     */
    impact: [
      {
        icon: 'ai',
        text: 'Production AI applications running on large language models.',
      },
      {
        icon: 'search',
        text: 'Retrieval pipelines that find the right document.',
      },
      {
        icon: 'server',
        text: 'The backend APIs and microservices carrying them.',
      },
      {
        icon: 'team',
        text: 'Third-party platforms reached through Model Context Protocol.',
      },
    ],
    highlights: [
      'Developed AI-powered applications using large language models, agentic AI, and retrieval-augmented generation.',
      'Built RAG pipelines for intelligent document retrieval.',
      'Developed backend APIs and microservices with FastAPI, Node.js, and Next.js.',
      'Integrated Model Context Protocol servers with third-party platforms including Gmail and Xero.',
      'Worked across PostgreSQL, MongoDB, Git, Docker, and AWS.',
      'Collaborated with cross-functional teams to develop, debug, and optimise production-ready AI applications.',
    ],
    stack: [
      'LLMs',
      'Agentic AI',
      'RAG',
      'MCP',
      'Python',
      'FastAPI',
      'Node.js',
      'Next.js',
      'PostgreSQL',
      'MongoDB',
      'Docker',
      'AWS',
      'Git',
    ],
  },
  {
    id: 'india-space-lab',
    org: 'India Space Lab',
    role: 'Technical Intern',
    kind: 'internship',
    start: '2026-02',
    end: '2026-03',
    summary:
      'A 45-day intensive in drone and aerospace engineering, ending in a full parametric aircraft model.',
    icon: 'rocket',
    impactLabel: 'Key outcome',
    impact: [
      {
        icon: 'plane',
        text: 'A complete parametric aircraft model, built in OpenVSP.',
      },
      {
        icon: 'target',
        text: 'Aerodynamics, propulsion and structures applied to one configuration.',
      },
      {
        icon: 'cube',
        text: 'The design visualised as a full three-dimensional configuration.',
      },
      {
        icon: 'award',
        text: 'A working foundation in conceptual aircraft design.',
      },
    ],
    highlights: [
      'Completed a hands-on internship focused on drone and aerospace technology.',
      'Studied aerodynamics, propulsion systems, and aircraft structures.',
      'Worked with OpenVSP, NASA’s parametric aircraft modelling tool.',
      'Designed and visualised an aircraft configuration inspired by the Cessna-210.',
      'Gained practical exposure to conceptual aircraft design and engineering fundamentals.',
    ],
    stack: ['OpenVSP', 'Aerodynamics', 'Parametric modelling'],
  },
] satisfies Experience[]

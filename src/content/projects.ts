import type { Project } from './schema'

/**
 * Four real projects, each structured as problem → approach → outcome so the
 * Projects section can render a consistent argument rather than a blurb.
 *
 * `links` is empty for now. The layout must handle that gracefully; adding a
 * repository link later is a one-line edit here and nowhere else.
 */
export const projects = [
  {
    id: 'api-monitoring-platform',
    name: 'API Monitoring & Automation Platform',
    category: 'fullstack-devops',
    year: 2026,
    problem:
      'Teams running many services find out an endpoint has broken when a user reports it, because nothing is watching between deploys.',
    approach:
      'A production-ready platform that tests endpoints automatically on a schedule, tracks their health over time, and reports by email — built as separate frontend and backend modules for API management, grouping, scheduling, testing, and analytics.',
    outcome:
      'A live dashboard showing API health, execution history, and scheduler state, with alerts reaching multiple recipients before users notice a failure.',
    stack: [
      'Next.js',
      'React',
      'TypeScript',
      'Python',
      'FastAPI',
      'MongoDB',
      'APScheduler',
      'Resend',
      'Docker',
    ],
    highlights: [
      'Real-time monitoring dashboard with live API health metrics, execution history, and scheduler management.',
      'Flexible scheduling supporting intervals in seconds, minutes, hours, and days via APScheduler.',
      'Automated health reports and alert notifications delivered to multiple recipients through Resend.',
      'Scalable frontend and backend modules for API management, grouping, scheduling, testing, and operational analytics.',
    ],
    links: [],
    featured: true,
  },
  {
    id: 'news-sentiment-analysis',
    name: 'News Sentiment Analysis & Summary Generator',
    category: 'ai-nlp',
    year: 2026,
    problem:
      'Following a developing story means reading the same event across many outlets, with no quick way to see the overall tone.',
    approach:
      'A tool that ingests news articles, classifies their sentiment, and generates condensed summaries — built with a team of three for the VISAI 2026 international project competition.',
    outcome:
      'Placed 5th against international teams at Vel Tech University, Chennai.',
    stack: ['Python'],
    highlights: [
      'Built as a team of three for an international project competition and exhibition.',
      'Combines sentiment classification with automated summary generation.',
    ],
    links: [],
    featured: true,
  },
  {
    id: 'gesture-media-controller',
    name: 'Gesture-Based Media Controller',
    category: 'ai-vision',
    year: 2025,
    problem:
      'Controlling media playback means reaching for a keyboard, which is awkward when your hands are busy or the screen is across the room.',
    approach:
      'A touch-free control system that recognises hand gestures from a live camera feed, using OpenCV for detection and a CNN classifier to identify each gesture.',
    outcome:
      'A responsive Streamlit interface that turns recognised gestures into media commands in real time.',
    stack: ['Python', 'OpenCV', 'CNN', 'Streamlit'],
    highlights: [
      'Real-time gesture detection implemented with OpenCV.',
      'CNN-based classifier trained to distinguish control gestures.',
      'Interactive Streamlit interface for immediate visual feedback.',
    ],
    links: [],
    featured: true,
  },
  {
    id: 'aircraft-conceptual-design',
    name: 'Aircraft Conceptual Design',
    category: 'cad-engineering',
    year: 2026,
    problem:
      'Conceptual aircraft design has to reconcile aerodynamics, structure, and propulsion before any detailed engineering begins.',
    approach:
      'A parametric aircraft model inspired by the Cessna-210, built in OpenVSP — fuselage, wings, horizontal and vertical stabilisers, and propeller system.',
    outcome:
      'A complete 3D configuration demonstrating applied aerodynamics and aircraft structural layout.',
    stack: ['OpenVSP', 'Aerodynamics', 'Parametric modelling'],
    highlights: [
      'Modelled fuselage, wings, horizontal and vertical stabilisers, and propeller system.',
      'Applied aerodynamics principles and aircraft structural configuration.',
      'Developed working understanding of aircraft geometry design and 3D visualisation.',
    ],
    links: [],
    featured: true,
  },
] satisfies Project[]

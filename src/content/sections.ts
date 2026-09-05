import type { Section } from './schema'

/**
 * The spine of the site (L6).
 *
 * Nav, mobile menu, page composition, scroll-spy, and footer links are all
 * generated from this one array. Reordering the story is an edit to `order`;
 * removing a section from the entire site is `enabled: false`. There is no
 * second list of links anywhere in the codebase.
 *
 * `stage` records which step of the visitor journey a section serves —
 * attention → understanding → proof → interaction → connection. It is real
 * information, not decoration, and the design surfaces it.
 */
export const sections = [
  {
    id: 'hero',
    navLabel: 'Home',
    order: 0,
    stage: 'attention',
    enabled: true,
  },
  {
    id: 'journey',
    navLabel: 'Journey',
    order: 1,
    stage: 'understanding',
    heading: 'The path so far',
    headingHighlights: ['so', 'far'],
    lede: 'Two internships in two very different fields, and the engineering that carries across both.',
    enabled: true,
  },
  {
    /**
     * Its own section rather than a block inside the journey.
     *
     * The timeline answers "where has he been"; this answers "what can he
     * do". They served one heading because they were written at the same
     * time, not because a reader wants them as one thing.
     */
    id: 'skills',
    navLabel: 'Skills',
    order: 2,
    stage: 'understanding',
    eyebrow: 'What I work with',
    heading: 'Skills & Expertise',
    headingHighlights: ['Expertise'],
    lede: 'A blend of AI, backend, and modern engineering practices to build scalable, intelligent, and reliable systems.',
    enabled: true,
  },
  {
    id: 'projects',
    navLabel: 'Projects',
    order: 3,
    stage: 'proof',
    heading: "Things I've built",
    lede: 'Each one started with a problem worth solving. Here is the problem, the approach, and what came out of it.',
    enabled: true,
  },
  {
    /**
     * After the proof, before the contact.
     *
     * It spent a while at the foot of the page, where almost nobody reached
     * it, and then in the corner of the hero, where it was visible but too
     * small to read an answer in. Here is where it was always meant to go:
     * by this point a visitor has seen the evidence and has questions, and
     * once they are answered they are ready to write. That is what the
     * "interaction" stage means.
     */
    id: 'assistant',
    navLabel: 'Ask',
    order: 4,
    stage: 'interaction',
    eyebrow: 'Interaction',
    heading: 'Ask about my work',
    headingHighlights: ['work'],
    lede: 'Answers come straight from this portfolio — no guessing, and nothing invented.',
    enabled: true,
  },
  {
    id: 'contact',
    navLabel: 'Contact',
    order: 5,
    stage: 'connection',
    heading: "Let's build something amazing.",
    headingHighlights: ['amazing.'],
    lede: 'Open to internships and graduate roles in AI and backend engineering.',
    enabled: true,
  },
  {
    /**
     * Built later, shipped dark. An empty blog with a "coming soon" costs
     * more credibility than no blog at all — so it stays off until there is
     * something to publish. Flipping `enabled` reveals it everywhere at once.
     */
    id: 'writing',
    navLabel: 'Writing',
    order: 6,
    stage: 'understanding',
    enabled: false,
  },
] satisfies Section[]

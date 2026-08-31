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
    lede: 'Two internships in two very different fields, and the engineering that carries across both.',
    enabled: true,
  },
  {
    id: 'projects',
    navLabel: 'Projects',
    order: 2,
    stage: 'proof',
    heading: "Things I've built",
    lede: 'Each one started with a problem worth solving. Here is the problem, the approach, and what came out of it.',
    enabled: true,
  },
  {
    /**
     * Off as a section, because it now lives in the hero.
     *
     * At the foot of the page almost nobody reached it — the one genuinely
     * interactive thing here was the last thing anyone would find. Beside the
     * introduction it is the second thing they see. The stage it serves is
     * unchanged; only where it happens has moved.
     */
    id: 'assistant',
    navLabel: 'Ask',
    order: 3,
    stage: 'interaction',
    heading: 'Ask about my work',
    lede: 'Answers come straight from this portfolio — no guessing, and nothing invented.',
    enabled: false,
  },
  {
    id: 'contact',
    navLabel: 'Contact',
    order: 4,
    stage: 'connection',
    heading: "Let's build something",
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
    order: 5,
    stage: 'understanding',
    enabled: false,
  },
] satisfies Section[]

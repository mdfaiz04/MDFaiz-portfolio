import type { Section } from './schema'

/**
 * The spine of the site (L6).
 *
 * Nav, page composition, scroll-spy, and footer links are all generated from
 * this one array. Reordering the story is an edit to `order`; removing a
 * section from the entire site is `enabled: false`. There is no second list
 * of links anywhere in the codebase.
 *
 * `stage` records which step of the visitor journey a section serves —
 * attention → understanding → proof → interaction → connection. It is real
 * information, not decoration, and the design uses it.
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
    enabled: true,
  },
  {
    id: 'projects',
    navLabel: 'Projects',
    order: 2,
    stage: 'proof',
    enabled: true,
  },
  {
    id: 'assistant',
    navLabel: 'Ask',
    order: 3,
    stage: 'interaction',
    enabled: true,
  },
  {
    id: 'contact',
    navLabel: 'Contact',
    order: 4,
    stage: 'connection',
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

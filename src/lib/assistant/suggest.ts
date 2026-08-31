import { profile, projects, skills } from '@/content'

/**
 * Suggested questions, generated from content rather than written by hand.
 *
 * Add a project and its question appears here on its own — which is why the
 * suggestions can never go stale or point at something that no longer exists.
 */

export type Suggestion = {
  id: string
  question: string
  /** Section this suggestion is most relevant to, for scroll-aware ordering. */
  sectionId: string
}

export const suggestions: readonly Suggestion[] = [
  ...projects.map((project) => ({
    id: `project-${project.id}`,
    question: `Tell me about ${project.name}`,
    sectionId: 'projects',
  })),
  {
    id: 'experience',
    question: 'What is your experience?',
    sectionId: 'journey',
  },
  {
    id: 'skills',
    question: 'What technologies do you use?',
    sectionId: 'journey',
  },
  ...skills.slice(0, 2).flatMap((cluster) => {
    const item = cluster.items[0]
    return item
      ? [
          {
            id: `skill-${cluster.id}`,
            question: `Do you know ${item}?`,
            sectionId: 'journey',
          },
        ]
      : []
  }),
  {
    id: 'availability',
    question: profile.availability.open
      ? 'Are you available for work?'
      : 'How can I reach you?',
    sectionId: 'contact',
  },
]

/**
 * Suggestions relevant to where the reader currently is, padded out with the
 * rest so the list is never sparse.
 */
export function suggestionsFor(sectionId: string, count = 4): Suggestion[] {
  const relevant = suggestions.filter((item) => item.sectionId === sectionId)
  const others = suggestions.filter((item) => item.sectionId !== sectionId)
  return [...relevant, ...others].slice(0, count)
}

import type { ProjectCategory } from './schema'

/**
 * Display labels for project categories.
 *
 * Kept as a lookup rather than repeated on each project (R5): the label for a
 * category is written once, and a component only ever holds the id.
 */
export const projectCategoryLabels: Record<ProjectCategory, string> = {
  'ai-nlp': 'AI / NLP',
  'ai-vision': 'AI / Computer Vision',
  'fullstack-devops': 'Full Stack / DevOps',
  'cad-engineering': 'CAD / Engineering',
}

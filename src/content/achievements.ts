import type { Achievement } from './schema'

/**
 * Competition results as recorded on the CV. The hero's "placements" counter
 * is derived from `kind: 'placement'` entries — it is never typed by hand.
 */
export const achievements = [
  {
    id: 'indiaskills-cloud-computing',
    title: 'Top 12 Finalist',
    kind: 'placement',
    event: 'Karnataka State IndiaSkills Competition',
    organisation: 'Skills India',
    year: 2026,
    detail:
      'Selected among the top candidates at the state-level Skills India competition, in Cloud Computing.',
  },
  {
    id: 'visai-2026',
    title: '5th Place',
    kind: 'placement',
    event: 'VISAI 2026 International Project Competition',
    organisation: 'Vel Tech University, Chennai',
    year: 2026,
    detail:
      'Competed against international teams with a News Sentiment Analysis & Summary Generator, built in a team of three.',
  },
] satisfies Achievement[]

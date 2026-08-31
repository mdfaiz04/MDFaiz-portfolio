/**
 * Dates are stored as ISO year-month strings and formatted here, at render.
 * No display date is ever written into content — that would be the same fact
 * recorded twice, in two formats, free to drift.
 */

/** Single home for the display locale. */
export const LOCALE = 'en-IN'

/** Label used wherever a role has no end date. */
export const PRESENT_LABEL = 'Present'

/** `"2026-04"` → `{ year: 2026, monthIndex: 3 }` */
function parseYearMonth(value: string): { year: number; monthIndex: number } {
  const [yearPart, monthPart] = value.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error(`Not an ISO year-month: "${value}"`)
  }

  return { year, monthIndex: month - 1 }
}

/** `"2026-04"` → `"Apr 2026"` */
export function formatMonth(value: string, locale: string = LOCALE): string {
  const { year, monthIndex } = parseYearMonth(value)
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)))
}

/** `("2026-02", "2026-03")` → `"Feb 2026 — Mar 2026"`; `null` end → "Present". */
export function formatRange(
  start: string,
  end: string | null,
  locale: string = LOCALE,
): string {
  const from = formatMonth(start, locale)
  const to = end === null ? PRESENT_LABEL : formatMonth(end, locale)
  return `${from} — ${to}`
}

/**
 * Whole months ELAPSED from `start` to `end` (or `asOf` when current).
 *
 * Deliberately not inclusive. Counting the month you are currently standing
 * in would report Feb → mid-Aug as seven months when six have actually
 * passed. On a portfolio the conservative number is the correct one: every
 * figure has to survive being questioned in an interview.
 */
export function monthsBetween(
  start: string,
  end: string | null,
  asOf: Date,
): number {
  const from = parseYearMonth(start)
  const to =
    end === null
      ? { year: asOf.getUTCFullYear(), monthIndex: asOf.getUTCMonth() }
      : parseYearMonth(end)

  const months = (to.year - from.year) * 12 + (to.monthIndex - from.monthIndex)

  return Math.max(0, months)
}

/**
 * `6` → `{ value: '6', unit: 'months' }`; `13` → `{ value: '1', unit: 'year' }`
 *
 * The hero prints the number large and the unit small, so it needs them
 * apart. Deriving both from the same count keeps them from disagreeing —
 * "1 years" is the classic way that breaks.
 */
export function splitDuration(months: number): {
  value: string
  unit: string
} {
  if (months < 12) {
    return { value: String(months), unit: months === 1 ? 'month' : 'months' }
  }

  const years = Math.floor(months / 12)
  return { value: String(years), unit: years === 1 ? 'year' : 'years' }
}

/** `6` → `"6 months"`; `13` → `"1 year 1 month"` */
export function formatDuration(months: number): string {
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }

  const years = Math.floor(months / 12)
  const remainder = months % 12
  const yearPart = `${years} ${years === 1 ? 'year' : 'years'}`

  if (remainder === 0) return yearPart

  return `${yearPart} ${remainder} ${remainder === 1 ? 'month' : 'months'}`
}

/**
 * A coarse land mask, as dots.
 *
 * The contact visual needs a world that reads as a world at a glance and
 * nothing more — no borders, no coastline detail, no projection accuracy
 * beyond "that is roughly Africa". A traced outline would be several hundred
 * kilobytes to say the same thing at this size.
 *
 * Stored as column RANGES per row rather than as rows of characters. Both
 * encode the same grid, but a range is countable by eye and a sixty-four
 * character string is not: one missing dot silently shifts a continent.
 */

/** Grid resolution. 64 columns of longitude, 32 rows of latitude. */
export const WORLD_COLUMNS = 64
export const WORLD_ROWS = 32

/**
 * Inclusive column ranges of land, by row.
 *
 * Row 0 is the far north, row 31 the far south. Antarctica is left out: it
 * appears on no flight path and its band of dots reads as a border.
 */
const LAND: Record<number, [number, number][]> = {
  2: [
    [10, 19],
    [25, 28],
    [41, 58],
  ],
  3: [
    [5, 21],
    [25, 28],
    [33, 36],
    [39, 61],
  ],
  4: [
    [4, 21],
    [26, 28],
    [32, 36],
    [39, 62],
  ],
  5: [
    [4, 22],
    [30, 31],
    [33, 37],
    [39, 62],
  ],
  6: [
    [7, 23],
    [30, 31],
    [33, 38],
    [40, 61],
  ],
  7: [
    [9, 23],
    [31, 38],
    [40, 60],
  ],
  8: [
    [10, 23],
    [30, 38],
    [41, 58],
  ],
  9: [
    [11, 22],
    [31, 39],
    [41, 45],
    [47, 56],
  ],
  10: [
    [12, 21],
    [30, 41],
    [43, 47],
    [49, 56],
  ],
  11: [
    [14, 20],
    [30, 42],
    [44, 47],
    [49, 54],
  ],
  12: [
    [15, 21],
    [30, 42],
    [44, 47],
    [50, 54],
  ],
  13: [
    [17, 22],
    [30, 43],
    [44, 47],
    [51, 55],
  ],
  14: [
    [20, 26],
    [30, 43],
    [45, 46],
    [52, 56],
  ],
  15: [
    [20, 27],
    [31, 42],
    [53, 58],
  ],
  16: [
    [20, 27],
    [31, 41],
    [53, 58],
  ],
  17: [
    [20, 28],
    [32, 40],
    [54, 58],
  ],
  18: [
    [20, 28],
    [32, 39],
    [54, 59],
  ],
  19: [
    [20, 27],
    [32, 39],
    [54, 60],
  ],
  20: [
    [20, 26],
    [32, 38],
    [53, 60],
  ],
  21: [
    [21, 26],
    [33, 37],
    [53, 60],
  ],
  22: [
    [21, 25],
    [33, 36],
    [53, 59],
  ],
  23: [
    [21, 24],
    [55, 58],
    [61, 62],
  ],
  24: [
    [21, 23],
    [61, 62],
  ],
  25: [[21, 23]],
  26: [[21, 22]],
}

export type WorldDot = {
  /** Column and row on the grid above. */
  column: number
  row: number
  /** 0..1 across and down, for placing the dot in a box of any size. */
  u: number
  v: number
}

/** Every land cell, once, as fractional positions. Built at module load. */
export const worldDots: readonly WorldDot[] = Object.entries(LAND).flatMap(
  ([rowKey, ranges]) => {
    const row = Number(rowKey)
    const dots: WorldDot[] = []

    for (const [from, to] of ranges) {
      for (let column = from; column <= to; column += 1) {
        dots.push({
          column,
          row,
          u: column / (WORLD_COLUMNS - 1),
          v: row / (WORLD_ROWS - 1),
        })
      }
    }

    return dots
  },
)

/**
 * Longitude and latitude to grid coordinates, so a route can be written in
 * degrees — which is checkable against an atlas — rather than in cells.
 */
export function fromDegrees(
  longitude: number,
  latitude: number,
): { u: number; v: number } {
  return {
    u: (longitude + 180) / 360,
    v: (85 - latitude) / 170,
  }
}

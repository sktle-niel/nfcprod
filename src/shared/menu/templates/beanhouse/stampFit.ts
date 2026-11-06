/*
 * How a business name and tagline are set around the round stamp, for any length. All sizes are in the units of the stamp's
 * 240 wide drawing. A line's width is an estimate from its letter count: the arc is cut to that width and the text is spaced
 * to fill it exactly (`textLength`), so any font lands on the same arc and only its letter spacing changes.
 */

export const CENTER = 120
/** The middle of the band of lettering, between the outer and the inner ring. */
const RING = 91
/** Width of an average capital with the stamp's tracking, as a share of the font size. */
const CAP_WIDTH = 0.76
/** Height of a capital as a share of the font size, to center a line in the band. */
const CAP_HEIGHT = 0.7

/** A name is set as large as it fits, stepping down a size or two when that makes room for the tagline. */
const NAME = { sizes: [33, 27, 22], smallest: 16, arc: 215 }
const SPLIT = { largest: 22, smallest: 11.5, arc: 164 }
const TAGLINE = { largest: 15, smallest: 11.5 }
/** The least room left on each side of the bottom arc, for the dots that close the ring. */
const SIDE_GAP = 9

type Place = 'top' | 'bottom'

export type Line = {
  text: string
  size: number
  /** Degrees of the circle it takes, centered on the top or the bottom. */
  arc: number
}

export type StampFit = {
  top: Line | null
  bottom: Line | null
  /** False when the name is too long for the ring: it is then printed in plain type under the stamp. */
  nameInRing: boolean
  /** False when the tagline is not in the ring: it is then printed in plain type under the stamp. */
  taglineInRing: boolean
}

/** The baseline radius of a line: glyphs stand outward from it on top, and hang inward from it on the bottom. */
export const baselineOf = (place: Place, size: number) => RING + ((place === 'top' ? -1 : 1) * size * CAP_HEIGHT) / 2

const degreesOf = (text: string, size: number, place: Place) => (([...text].length * CAP_WIDTH * size) / (2 * Math.PI * baselineOf(place, size))) * 360

/** The line at the largest size within `arc` degrees, or null if even `smallest` is too big. */
function fitLine(text: string, place: Place, arc: number, largest: number, smallest: number): Line | null {
  const size = Math.min(largest, (largest * arc) / degreesOf(text, largest, place))
  return size < smallest ? null : { text, size, arc: degreesOf(text, size, place) }
}

/** Splits a name in two at the space nearest its middle, or null when it is one word. */
function halves(name: string): [string, string] | null {
  const words = name.split(' ')
  let best: [string, string] | null = null
  for (let at = 1; at < words.length; at += 1) {
    const pair: [string, string] = [words.slice(0, at).join(' '), words.slice(at).join(' ')]
    if (best === null || Math.abs(pair[0].length - pair[1].length) < Math.abs(best[0].length - best[1].length)) best = pair
  }
  return best
}

const lettering = (text: string) => text.trim().replace(/\s+/g, ' ').toUpperCase()

/** The name on top, and the tagline below when there is room. A long name takes both arcs. A longer one goes under the stamp in plain type. */
export function fitStamp(name: string, tagline: string): StampFit {
  const title = lettering(name)
  const motto = lettering(tagline)
  const [largest = 0] = NAME.sizes
  const top = fitLine(title, 'top', NAME.arc, largest, NAME.smallest)
  if (top !== null) {
    for (const size of NAME.sizes) {
      const name = fitLine(title, 'top', NAME.arc, size, NAME.smallest)
      const bottom = name && motto !== '' ? fitLine(motto, 'bottom', 360 - name.arc - 2 * SIDE_GAP, TAGLINE.largest, TAGLINE.smallest) : null
      if (name && bottom) return { top: name, bottom, nameInRing: true, taglineInRing: true }
    }
    return { top, bottom: null, nameInRing: true, taglineInRing: false }
  }
  const pair = halves(title)
  const first = pair && fitLine(pair[0], 'top', SPLIT.arc, SPLIT.largest, SPLIT.smallest)
  const second = pair && fitLine(pair[1], 'bottom', SPLIT.arc, SPLIT.largest, SPLIT.smallest)
  if (first && second) {
    const size = Math.min(first.size, second.size)
    const line = (text: string, place: Place): Line => ({ text, size, arc: degreesOf(text, size, place) })
    return { top: line(first.text, 'top'), bottom: line(second.text, 'bottom'), nameInRing: true, taglineInRing: false }
  }
  const fallback = motto === '' ? null : fitLine(motto, 'top', NAME.arc, TAGLINE.largest, TAGLINE.smallest)
  return { top: fallback, bottom: null, nameInRing: false, taglineInRing: fallback !== null }
}

const round = (value: number) => Math.round(value * 100) / 100

/** A point on a circle around the stamp's center, `degrees` clockwise from the top. */
function pointAt(radius: number, degrees: number): string {
  const turn = (degrees * Math.PI) / 180
  return `${round(CENTER + radius * Math.sin(turn))} ${round(CENTER - radius * Math.cos(turn))}`
}

/** The arc from `from` to `to` degrees, clockwise if `to` is greater, as an SVG path. */
export function arcPath(radius: number, from: number, to: number): string {
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${pointAt(radius, from)} A ${round(radius)} ${round(radius)} 0 ${large} ${to > from ? 1 : 0} ${pointAt(radius, to)}`
}

/** The length of an arc, in the drawing's units. */
export const arcLength = (radius: number, degrees: number) => round((2 * Math.PI * radius * degrees) / 360)

/** The path of a line's arc. The top runs clockwise and the bottom counterclockwise, so both read from left to right. */
export function linePath(line: Line, place: Place): string {
  const radius = baselineOf(place, line.size)
  return place === 'top' ? arcPath(radius, -line.arc / 2, line.arc / 2) : arcPath(radius, 180 + line.arc / 2, 180 - line.arc / 2)
}

/** The two runs of dots that close the ring beside the lines, one down each side. */
export function dotArcs(fit: Pick<StampFit, 'top' | 'bottom'>): [string, string] {
  const margin = 7
  const from = (fit.top?.arc ?? 0) / 2 + margin
  const to = 180 - (fit.bottom?.arc ?? 0) / 2 - margin
  return [arcPath(RING, from, to), arcPath(RING, -from, -to)]
}

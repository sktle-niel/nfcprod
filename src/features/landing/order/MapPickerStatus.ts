import { copy } from '@/config/copy'
import type { ResolvedPlaces } from '@/data/resolveAddress'

/** Everything the status line under the search box can say. */
export type StatusKey =
  | 'hint'
  | 'looking'
  | 'found'
  | 'partial'
  | 'none'
  | 'busy'
  | 'offline'
  | 'outside'
  | 'moved'
  | 'zoomIn'
  | 'locating'
  | 'denied'
  | 'unavailable'
  | 'timeout'

export type Status = {
  key: StatusKey
  /** Our own names for `found` and `partial`, narrowest first: "Lahug, Cebu City, Cebu". */
  place?: string
  /** The pin came from a weak location fix, so the customer is asked to check it. */
  coarse?: boolean
  /**
   * Counts the messages said so far. The status line shows its words in a node keyed by this number, so the same
   * words said twice are a new node and a screen reader reads them again: a live region is only read when it changes.
   */
  said?: number
}

export const HINT: Status = { key: 'hint' }

/** The words for a status. The place text is built from our own place lists, never from map text. */
export function statusText({ key, place = '', coarse = false }: Status): string {
  const { hint, locating, zoomIn, status, location } = copy.order.map
  // A function as replacement, so a "$" in a name can never act as a replacement pattern.
  const withPlace = (text: string) => text.replace('{place}', () => place)
  const base: Record<StatusKey, string> = {
    hint,
    looking: status.looking,
    found: withPlace(status.found),
    partial: withPlace(status.partial),
    none: status.none,
    busy: status.busy,
    offline: status.offline,
    outside: status.outside,
    moved: status.moved,
    zoomIn,
    locating,
    denied: location.denied,
    unavailable: location.unavailable,
    timeout: location.timeout,
  }
  return coarse ? `${base[key]} ${location.coarse}` : base[key]
}

/** `warn` is for the one message that says the pin was refused. */
export function statusTone({ key }: Status): 'info' | 'warn' {
  return key === 'outside' ? 'warn' : 'info'
}

/** What a finished lookup says: all three levels matched (found), some (partial) or none. */
export function describePlaces(places: ResolvedPlaces): Status {
  const names = [places.barangay, places.city, places.province].flatMap((level) => (level ? [level.name] : []))
  if (names.length === 0) return { key: 'none' }
  const all = places.barangay && places.city && places.province
  return { key: all ? 'found' : 'partial', place: names.join(', ') }
}

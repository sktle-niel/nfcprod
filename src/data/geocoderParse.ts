import type { AddressHint } from '@/entities/location/match'
import { isInPhilippines, roundPin } from '@/entities/location/pin'
import { isRecord } from '@/shared/lib/record'
import { cleanText } from '@/shared/lib/text'
import type { SearchHit } from './geocoder'

// Everything below reads an answer that came from outside. Only strings survive, cleaned and cut short.
const MAX_TEXT = 100
const MAX_LABEL = 120
const MAX_HITS = 5

// Where Nominatim puts the names of areas inside a city. Any of them may be a barangay. Manila is the reason for
// city_block: its answer for Intramuros has the barangay there ("Barangay 655") and only the district under quarter.
const AREA_KEYS = ['village', 'suburb', 'quarter', 'neighbourhood', 'city_block', 'hamlet'] as const

// The plain fields of the hint and the key of the answer each one comes from.
const TEXT_FIELDS = [
  ['state', 'state'],
  ['region', 'region'],
  ['isoRegion', 'ISO3166-2-lvl3'],
  ['road', 'road'],
  ['houseNumber', 'house_number'],
] as const

/** A string with control characters and extra spaces gone, cut to `max` characters. Undefined for anything else, or for nothing. */
function text(value: unknown, max = MAX_TEXT): string | undefined {
  if (typeof value !== 'string') return undefined
  const clean = cleanText(value)
  // Cut by characters, not by UTF-16 units, so that a pair is never split in half.
  const cut = clean.length > max ? Array.from(clean).slice(0, max).join('').trim() : clean
  return cut === '' ? undefined : cut
}

/** The settlement as the map names it: `city` first, then `town`, then `municipality` (which counts as a town). */
function readSettlement(address: Record<string, unknown>): AddressHint['settlement'] {
  const city = text(address['city'])
  if (city !== undefined) return { name: city, kind: 'city' }
  const town = text(address['town']) ?? text(address['municipality'])
  return town === undefined ? undefined : { name: town, kind: 'town' }
}

/**
 * What a Nominatim `reverse` answer says about the spot. A spot with no address (the sea, for one) is answered with
 * `{"error": ...}`: that is a hint with nothing in it, not a failure. 'outside' for another country, 'unavailable'
 * for an answer that does not look like one.
 */
export function readHint(body: unknown): AddressHint | 'outside' | 'unavailable' {
  if (!isRecord(body)) return 'unavailable'
  if ('error' in body) return { areas: [] }

  const address = body['address']
  if (!isRecord(address)) return 'unavailable'
  if (text(address['country_code'])?.toLowerCase() !== 'ph') return 'outside'

  const areas = AREA_KEYS.map((key) => text(address[key])).filter((name): name is string => name !== undefined)
  const hint: AddressHint = { areas: [...new Set(areas)] }

  const settlement = readSettlement(address)
  if (settlement) hint.settlement = settlement
  for (const [key, source] of TEXT_FIELDS) {
    const value = text(address[source])
    if (value !== undefined) hint[key] = value
  }
  return hint
}

// A coordinate is a plain decimal. Not "0x7F", not "1e2": a number written any other way is not one we trust.
const DECIMAL = /^[+-]?\d+(?:\.\d+)?$/

function readCoordinate(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  return typeof value === 'string' && DECIMAL.test(value.trim()) ? Number(value) : undefined
}

/**
 * The places a Nominatim `search` answer lists: at most five, inside the Philippines, with a label that is plain text.
 * Nominatim writes `lat` and `lon` as strings. 'unavailable' for an answer that is not a list.
 */
export function readHits(body: unknown): SearchHit[] | 'unavailable' {
  if (!Array.isArray(body)) return 'unavailable'
  const items: unknown[] = body

  const hits: SearchHit[] = []
  for (const item of items) {
    if (hits.length === MAX_HITS) break
    if (!isRecord(item)) continue
    const label = text(item['display_name'], MAX_LABEL)
    const lat = readCoordinate(item['lat'])
    const lng = readCoordinate(item['lon'])
    if (label === undefined || lat === undefined || lng === undefined) continue

    const pin = roundPin({ lat, lng })
    if (isInPhilippines(pin)) hits.push({ label, pin })
  }
  return hits
}

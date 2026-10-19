import { cleanText, PLACE_NAME } from '@/entities/order/validate'

/** A province, a city or municipality, or a barangay, as the Philippine Standard Geographic Code (PSGC) lists it. */
export type Place = {
  /** PSGC code. Digits only, so it is safe inside a URL path. */
  code: string
  /** The official name, cleaned so that it passes the order rules. */
  name: string
}

// PSGC codes have 9 digits (10 in the newer scheme). Anything else is not a code we can ask for.
const CODE = /^\d{9,10}$/

export function isPlaceCode(value: unknown): value is string {
  return typeof value === 'string' && CODE.test(value)
}

// Every character the order rules refuse. The PSA marks a few barangays with a trailing "*", for example.
const NOT_ALLOWED = /[^\p{L}\p{M}\p{N} .,#'’()/&-]/gu

// The PSA writes "City of Cebu" for most cities and "Quezon City" for a few. People say "Cebu City".
const CITY_OF = /^city of (.+)$/i

/** A name the order form accepts, or null when nothing usable is left of it. */
export function toPlaceName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = cleanText(cleanText(value).replace(NOT_ALLOWED, '')).replace(CITY_OF, '$1 City')
  const { min, max, pattern } = PLACE_NAME
  return name.length >= min && name.length <= max && pattern.test(name) ? name : null
}

// "Barangay 2" comes before "Barangay 10".
const collator = new Intl.Collator('en', { numeric: true })

export function sortPlaces(places: readonly Place[]): Place[] {
  return [...places].sort((a, b) => collator.compare(a.name, b.name))
}

// The biggest real list is the 897 barangays of Manila. A list far beyond that is not a list of places.
const MAX_ITEMS = 5000

/** Reads a list of places that came from outside. Bad items are dropped. Null means it is not a usable list. */
export function parsePlaces(data: unknown): Place[] | null {
  if (!Array.isArray(data) || data.length > MAX_ITEMS) return null

  const byCode = new Map<string, Place>()
  for (const item of data as unknown[]) {
    if (typeof item !== 'object' || item === null) continue
    const code: unknown = 'code' in item ? item.code : undefined
    const name = toPlaceName('name' in item ? item.name : undefined)
    if (isPlaceCode(code) && name !== null && !byCode.has(code)) byCode.set(code, { code, name })
  }

  // Something was sent, and none of it is usable: the format must have changed.
  if (byCode.size === 0 && data.length > 0) return null
  return sortPlaces([...byCode.values()])
}

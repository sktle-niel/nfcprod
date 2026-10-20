import { cleanText, PLACE_NAME } from '@/entities/order/validate'
import { isRecord } from '@/shared/lib/record'

/** A province, a city or municipality, or a barangay, as the Philippine Standard Geographic Code (PSGC) lists it. */
export type Place = {
  /** PSGC code. Digits only, so it is safe inside a URL path. */
  code: string
  /** The official name, cleaned so that it passes the order rules. */
  name: string
}

/**
 * A city or municipality together with where it sits. Used to find a city from a name alone,
 * because a map lookup does not always say which province a city is in.
 */
export type CityRef = Place & {
  /** Code of the province, or of Metro Manila, as `LocationRepository.provinces()` lists it. */
  provinceCode: string
  /** PSGC code of the region, for example 070000000 for Central Visayas. */
  regionCode: string
  /** A city (true) or a municipality (false). */
  isCity: boolean
}

/** Metro Manila is a region with no provinces. The lists show it as a province, and this is the code it goes by in both roles. */
export const METRO_MANILA_CODE = '130000000'

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

export function sortPlaces<T extends Place>(places: readonly T[]): T[] {
  return [...places].sort((a, b) => collator.compare(a.name, b.name))
}

// The biggest real lists are every city and municipality (1,634) and the 897 barangays of Manila.
// A list far beyond that is not a list of places.
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

/**
 * Reads one item of the list of every city and municipality. Null when it is not usable.
 * The API gives no province to the cities of Metro Manila and to a few left-out cities: Metro Manila's cities get
 * its code, and `provinceOf` (city code to province code) says where the left-out ones belong.
 */
function toCityRef(item: unknown, provinceOf: ReadonlyMap<string, string>): CityRef | null {
  if (!isRecord(item)) return null
  const { code, regionCode, isCity } = item
  const name = toPlaceName(item['name'])
  if (!isPlaceCode(code) || !isPlaceCode(regionCode) || typeof isCity !== 'boolean' || name === null) return null

  const given = item['provinceCode']
  const fallback = provinceOf.get(code) ?? (regionCode === METRO_MANILA_CODE ? METRO_MANILA_CODE : undefined)
  const provinceCode = given === false ? fallback : given
  return isPlaceCode(provinceCode) ? { code, name, provinceCode, regionCode, isCity } : null
}

/**
 * Reads the list of every city and municipality that came from outside. Bad items are dropped, and so is an item
 * with no province that cannot be placed. Null means it is not a usable list.
 */
export function parseCityRefs(data: unknown, provinceOf: ReadonlyMap<string, string> = new Map()): CityRef[] | null {
  if (!Array.isArray(data) || data.length > MAX_ITEMS) return null

  const byCode = new Map<string, CityRef>()
  for (const item of data as unknown[]) {
    const city = toCityRef(item, provinceOf)
    if (city !== null && !byCode.has(city.code)) byCode.set(city.code, city)
  }

  // Something was sent, and none of it is usable: the format must have changed.
  if (byCode.size === 0 && data.length > 0) return null
  return sortPlaces([...byCode.values()])
}

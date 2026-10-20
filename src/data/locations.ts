import { env } from '@/config/env'
import {
  isPlaceCode,
  METRO_MANILA_CODE,
  parseCityRefs,
  parsePlaces,
  sortPlaces,
  type CityRef,
  type Place,
} from '@/entities/location/place'

/** A list of places could not be loaded, or what came back was not a list of places. */
export class LocationError extends Error {}

/** The seam between the order form and wherever the lists of places come from. */
export interface LocationRepository {
  /** Every province, and Metro Manila (it has no provinces under it). */
  provinces(): Promise<Place[]>
  /** The cities and municipalities of a province or of Metro Manila. */
  cities(provinceCode: string): Promise<Place[]>
  /** The barangays of a city or municipality. */
  barangays(cityCode: string): Promise<Place[]>
  /** Every city and municipality in the country with its province, to find one by name alone. Large: ask only when needed. */
  allCities(): Promise<CityRef[]>
}

/** The free public PSGC API: static JSON files of the Philippine Standard Geographic Code, with CORS open. */
export const PSGC_API = 'https://psgc.gitlab.io/api'

const METRO_MANILA: Place = { code: METRO_MANILA_CODE, name: 'Metro Manila' }

// Two cities that the PSGC API lists under no province, so they would be missing from the lists.
// They lie inside these provinces on the ground. Maps province code to the codes of its extra cities.
const LEFT_OUT: Readonly<Record<string, readonly string[]>> = {
  '150700000': ['099701000'], // Basilan: City of Isabela
  '153800000': ['129804000'], // Maguindanao: City of Cotabato
}

// The same two cities the other way round, to give them a province in the list of every city.
const PROVINCE_OF_LEFT_OUT: ReadonlyMap<string, string> = new Map(
  Object.entries(LEFT_OUT).flatMap(([province, cityCodes]) => cityCodes.map((cityCode) => [cityCode, province] as const)),
)

const TIMEOUT_MS = 12_000
// The biggest real lists are every city and municipality (about 390 KB) and the 897 barangays of Manila (about 240 KB).
const MAX_CHARS = 1_000_000

/** GET one JSON document. No cookies, no referrer: the host only learns which code was asked for. */
async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) throw new LocationError(`status ${response.status}`)
    const text = await response.text()
    if (text.length > MAX_CHARS) throw new LocationError('too large')
    return JSON.parse(text)
  } catch (error) {
    throw error instanceof LocationError ? error : new LocationError('unavailable')
  } finally {
    clearTimeout(timer)
  }
}

function uniqueByCode(places: readonly Place[]): Place[] {
  return [...new Map(places.map((place) => [place.code, place])).values()]
}

/** One request per key, shared by everyone who asks. A failure is forgotten, so asking again tries again. */
function remember<T>(): (key: string, make: () => Promise<T>) => Promise<T> {
  const requests = new Map<string, Promise<T>>()
  return (key, make) => {
    const known = requests.get(key)
    if (known) return known
    const request = make()
    requests.set(key, request)
    request.catch(() => {
      if (requests.get(key) === request) requests.delete(key)
    })
    return request
  }
}

export function psgcLocations(baseUrl: string = PSGC_API): LocationRepository {
  const base = baseUrl.replace(/\/+$/, '')
  const placeLists = remember<Place[]>()
  const cityLists = remember<CityRef[]>()

  function load(path: string, wrap = false): Promise<Place[]> {
    return placeLists(path, () =>
      getJson(`${base}${path}`).then((data) => {
        const places = parsePlaces(wrap ? [data] : data)
        if (!places) throw new LocationError('not a list of places')
        return places
      }),
    )
  }

  // The codes end up in a URL path, so only digits get through.
  function asCode(value: string): string {
    if (!isPlaceCode(value)) throw new LocationError('not a place code')
    return value
  }

  return {
    async provinces() {
      return sortPlaces([...(await load('/provinces/')), METRO_MANILA])
    },

    async cities(provinceCode) {
      const parent = asCode(provinceCode)
      if (parent === METRO_MANILA.code) return load(`/regions/${parent}/cities-municipalities/`)

      const cities = await load(`/provinces/${parent}/cities-municipalities/`)
      // Best effort: if an extra city cannot be loaded, the rest of the list is still worth showing.
      const extra = await Promise.all(
        (LEFT_OUT[parent] ?? []).map((cityCode) => load(`/cities-municipalities/${cityCode}/`, true).catch(() => [])),
      )
      return extra.some((list) => list.length > 0) ? sortPlaces(uniqueByCode([...cities, ...extra.flat()])) : cities
    },

    async barangays(cityCode) {
      return load(`/cities-municipalities/${asCode(cityCode)}/barangays/`)
    },

    // About 390 KB, so it is asked for only when a pin has to be matched, and then kept.
    allCities() {
      return cityLists('all', () =>
        getJson(`${base}/cities-municipalities/`).then((data) => {
          const cities = parseCityRefs(data, PROVINCE_OF_LEFT_OUT)
          if (!cities) throw new LocationError('not a list of places')
          return cities
        }),
      )
    },
  }
}

// Only https (or local http while developing). Anything else falls back to the public API.
const usable = /^https:\/\//.test(env.locationsApi) || /^http:\/\/localhost[:/]/.test(env.locationsApi)

export const locations: LocationRepository = psgcLocations(usable ? env.locationsApi : PSGC_API)

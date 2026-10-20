import type { LocationRepository } from '@/data/locations'
import { matchBarangay, matchCity, matchProvince, type AddressHint } from '@/entities/location/match'
import type { Place } from '@/entities/location/place'
import { PLACE_NAME } from '@/entities/order/validate'
import { cleanText } from '@/shared/lib/text'

/** The places of our own lists that a lookup could be matched to. A missing level means it could not be matched. */
export type ResolvedPlaces = {
  province?: Place
  city?: Place
  barangay?: Place
  /** The road and house number the map gave, cleaned to fit the street rules. Missing when there is none worth using. */
  street?: string
}

// The length rules of the street field (`RULES.street` in `validate.ts`). Its characters are the same as a place name's.
const STREET = { min: 3, max: 120 }

/** The house number and road as one street line the order form accepts, or undefined when nothing usable is left. */
function toStreet(hint: AddressHint): string | undefined {
  // A house number alone is not a street.
  if (!hint.road) return undefined
  const line = cleanText([hint.houseNumber, hint.road].filter(Boolean).join(' '))
  // Every character the order rules refuse becomes a space, so that "Quezon–Aurora" does not turn into one word.
  const street = cleanText(Array.from(line, (char) => (PLACE_NAME.pattern.test(char) ? char : ' ')).join(''))
  return street.length >= STREET.min && street.length <= STREET.max ? street : undefined
}

// The lists carry more than a place needs. What goes out is the code and the name, like the lists the form shows.
const plain = ({ code, name }: Place): Place => ({ code, name })

/** The barangays of a city, or none when they cannot be loaded: the barangay is best effort, the city and province are not lost for it. */
async function loadBarangays(locations: LocationRepository, cityCode: string): Promise<Place[]> {
  try {
    return await locations.barangays(cityCode)
  } catch {
    return []
  }
}

/**
 * Turns a lookup into names from the official lists. Never guesses: when two places fit equally, that level stays empty.
 *
 * The city comes first, because the map often leaves out the province (it does for Metro Manila and for most independent
 * cities) but the lists know the province of every city. When the city is missing or fits several places, the province
 * the map names is used on its own. The barangay is best effort: it is matched inside the city, and a list that cannot
 * be loaded just leaves it empty. The street rides along with a match only, so a result with no place in it is empty.
 *
 * Rejects only when a list needed to find the city or the province cannot be loaded.
 */
export async function resolveAddress(hint: AddressHint, locations: LocationRepository): Promise<ResolvedPlaces> {
  const needsCity = hint.settlement !== undefined
  if (!needsCity && !hint.state) return {}

  // The list of every city is large: ask for it only when the hint names a city.
  const [provinces, cities] = await Promise.all([locations.provinces(), needsCity ? locations.allCities() : []])

  const found = matchCity(hint, cities, provinces)
  const places: ResolvedPlaces = {}

  if (found !== null && found !== 'ambiguous') {
    places.province = plain(found.province)
    places.city = plain(found.city)
    const barangay = matchBarangay(hint.areas, await loadBarangays(locations, found.city.code))
    if (barangay) places.barangay = plain(barangay)
  } else {
    const province = hint.state ? matchProvince(hint.state, provinces) : null
    if (province) places.province = plain(province)
  }

  const street = toStreet(hint)
  return street !== undefined && Object.keys(places).length > 0 ? { ...places, street } : places
}

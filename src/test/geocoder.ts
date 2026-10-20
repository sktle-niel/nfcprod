import { GeocoderError, type ReverseGeocoder } from '@/data/geocoder'
import type { AddressHint } from '@/entities/location/match'

/** What a lookup says for a spot in Lahug, Cebu City. With `fakeLocations()` it resolves to Cebu, Cebu City, Lahug and "12 Salinas Drive". */
export const LAHUG_HINT: AddressHint = {
  region: 'Central Visayas',
  isoRegion: 'PH-07',
  settlement: { name: 'Cebu City', kind: 'city' },
  areas: ['Lahug'],
  road: 'Salinas Drive',
  houseNumber: '12',
}

/**
 * What Nominatim really answered for a restaurant in Intramuros, Manila (2026-10-19), cut down to its address. The
 * barangay is under `city_block` ("Barangay 655"); `quarter` only has the district. Metro Manila has no province key.
 */
export const INTRAMUROS_ANSWER = {
  display_name: 'Ristorante delle Mitre, 470, General Luna Street, Barangay 655, Intramuros, Fifth District, Manila, Capital District, Metro Manila, 1002, Philippines',
  address: {
    amenity: 'Ristorante delle Mitre',
    house_number: '470',
    road: 'General Luna Street',
    city_block: 'Barangay 655',
    quarter: 'Intramuros',
    city_district: 'Fifth District',
    city: 'Manila',
    state_district: 'Capital District',
    region: 'Metro Manila',
    'ISO3166-2-lvl3': 'PH-00',
    postcode: '1002',
    country: 'Philippines',
    country_code: 'ph',
  },
}

/** A stand-in for the geocoder: Lahug for any spot, one search result, and a call log. Override what a test needs. */
export function fakeGeocoder(overrides: Partial<ReverseGeocoder> = {}): ReverseGeocoder {
  return {
    reverse: async () => LAHUG_HINT,
    search: async () => [{ label: 'Lahug, Cebu City, Central Visayas', pin: { lat: 10.328, lng: 123.906 } }],
    ...overrides,
  }
}

/** A geocoder that always fails the same way, for the failure messages. */
export function failingGeocoder(code: 'busy' | 'unavailable' | 'outside'): ReverseGeocoder {
  return fakeGeocoder({
    reverse: () => Promise.reject(new GeocoderError(code)),
    search: () => Promise.reject(new GeocoderError(code)),
  })
}

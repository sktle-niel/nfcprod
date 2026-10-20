import type { LocationRepository } from '@/data/locations'
import type { CityRef, Place } from '@/entities/location/place'

export const CEBU: Place = { code: '072200000', name: 'Cebu' }
export const ILOCOS_NORTE: Place = { code: '012800000', name: 'Ilocos Norte' }
export const METRO_MANILA: Place = { code: '130000000', name: 'Metro Manila' }
export const CEBU_CITY: Place = { code: '072217000', name: 'Cebu City' }
export const ALCANTARA: Place = { code: '072201000', name: 'Alcantara' }
export const LAOAG: Place = { code: '012805000', name: 'Laoag City' }
export const MANILA: Place = { code: '133900000', name: 'Manila City' }
export const LAHUG: Place = { code: '072217044', name: 'Lahug' }
export const ADLAON: Place = { code: '072217001', name: 'Adlaon' }
export const POBLACION: Place = { code: '072201001', name: 'Poblacion' }

const CITIES: Record<string, Place[]> = {
  [CEBU.code]: [ALCANTARA, CEBU_CITY],
  [ILOCOS_NORTE.code]: [LAOAG],
  [METRO_MANILA.code]: [MANILA],
}

const BARANGAYS: Record<string, Place[]> = {
  [CEBU_CITY.code]: [ADLAON, LAHUG],
  [ALCANTARA.code]: [POBLACION],
}

// PSGC region codes.
const ILOCOS_REGION = '010000000'
const CENTRAL_LUZON = '030000000'
const CENTRAL_VISAYAS = '070000000'
const NORTHERN_MINDANAO = '100000000'
const NCR = '130000000'

/** A city or municipality with where it sits. A city unless `isCity` says otherwise. */
export function cityRef(place: Place, province: Place, regionCode: string, isCity = true): CityRef {
  return { ...place, provinceCode: province.code, regionCode, isCity }
}

/** The fake cities and municipalities with their provinces, to find one by name alone. */
export const CITY_REFS: readonly CityRef[] = [
  cityRef(ALCANTARA, CEBU, CENTRAL_VISAYAS, false),
  cityRef(CEBU_CITY, CEBU, CENTRAL_VISAYAS),
  cityRef(LAOAG, ILOCOS_NORTE, ILOCOS_REGION),
  cityRef(MANILA, METRO_MANILA, NCR),
]

// A name that repeats: two cities and two municipalities called San Fernando, in four provinces. Only the clues in a
// lookup (the province, city or town, the region) tell them apart. They are not in the default lists, which the form tests count.
export const LA_UNION: Place = { code: '013300000', name: 'La Union' }
export const PAMPANGA: Place = { code: '035400000', name: 'Pampanga' }
export const BUKIDNON: Place = { code: '101300000', name: 'Bukidnon' }
export const SAN_FERNANDO_LA_UNION = cityRef({ code: '013314000', name: 'San Fernando City' }, LA_UNION, ILOCOS_REGION)
export const SAN_FERNANDO_PAMPANGA = cityRef({ code: '035416000', name: 'San Fernando City' }, PAMPANGA, CENTRAL_LUZON)
export const SAN_FERNANDO_CEBU = cityRef({ code: '072241000', name: 'San Fernando' }, CEBU, CENTRAL_VISAYAS, false)
export const SAN_FERNANDO_BUKIDNON = cityRef({ code: '101318000', name: 'San Fernando' }, BUKIDNON, NORTHERN_MINDANAO, false)

/** A small stand-in for the PSGC lists: three provinces, a few cities and a few barangays, already in order. */
export function fakeLocations(overrides: Partial<LocationRepository> = {}): LocationRepository {
  return {
    provinces: async () => [CEBU, ILOCOS_NORTE, METRO_MANILA],
    cities: async (provinceCode) => CITIES[provinceCode] ?? [],
    barangays: async (cityCode) => BARANGAYS[cityCode] ?? [],
    allCities: async () => [...CITY_REFS],
    ...overrides,
  }
}

/** The fake lists plus the four places called San Fernando and their provinces, to test a name that repeats. */
export function fakeLocationsWithRepeatedNames(overrides: Partial<LocationRepository> = {}): LocationRepository {
  const extra = [SAN_FERNANDO_LA_UNION, SAN_FERNANDO_PAMPANGA, SAN_FERNANDO_CEBU, SAN_FERNANDO_BUKIDNON]
  return fakeLocations({
    provinces: async () => [BUKIDNON, CEBU, ILOCOS_NORTE, LA_UNION, METRO_MANILA, PAMPANGA],
    cities: async (provinceCode) => [
      ...(CITIES[provinceCode] ?? []),
      ...extra.filter((city) => city.provinceCode === provinceCode).map(({ code, name }) => ({ code, name })),
    ],
    allCities: async () => [...CITY_REFS, ...extra],
    ...overrides,
  })
}

/** A promise you settle by hand, to test what the screen does while a list is on its way. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

import type { LocationRepository } from '@/data/locations'
import type { Place } from '@/entities/location/place'

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

/** A small stand-in for the PSGC lists: three provinces, a few cities and a few barangays, already in order. */
export function fakeLocations(overrides: Partial<LocationRepository> = {}): LocationRepository {
  return {
    provinces: async () => [CEBU, ILOCOS_NORTE, METRO_MANILA],
    cities: async (provinceCode) => CITIES[provinceCode] ?? [],
    barangays: async (cityCode) => BARANGAYS[cityCode] ?? [],
    ...overrides,
  }
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

import { describe, expect, it, vi } from 'vitest'
import type { AddressHint } from '@/entities/location/match'
import type { Place } from '@/entities/location/place'
import { PLACE_NAME } from '@/entities/order/validate'
import { INTRAMUROS_ANSWER, LAHUG_HINT } from '@/test/geocoder'
import {
  ADLAON,
  ALCANTARA,
  CEBU,
  CEBU_CITY,
  CITY_REFS,
  fakeLocations,
  fakeLocationsWithRepeatedNames,
  ILOCOS_NORTE,
  LA_UNION,
  LAHUG,
  LAOAG,
  MANILA,
  METRO_MANILA,
  POBLACION,
  SAN_FERNANDO_LA_UNION,
} from '@/test/locations'
import { readHint } from './geocoderParse'
import { resolveAddress } from './resolveAddress'

const hint = (extra: Partial<AddressHint> = {}): AddressHint => ({ areas: [], ...extra })
const city = (name: string, kind: 'city' | 'town' = 'city') => ({ settlement: { name, kind } })

describe('resolveAddress', () => {
  describe('a spot in a city', () => {
    it('gives the province, the city, the barangay and the street', async () => {
      await expect(resolveAddress(LAHUG_HINT, fakeLocations())).resolves.toStrictEqual({
        province: CEBU,
        city: CEBU_CITY,
        barangay: LAHUG,
        street: '12 Salinas Drive',
      })
    })

    it('gives plain places, with a code and a name and nothing else', async () => {
      const result = await resolveAddress(LAHUG_HINT, fakeLocations())
      for (const place of [result.province, result.city, result.barangay]) {
        expect(Object.keys(place ?? {}).sort()).toEqual(['code', 'name'])
      }
    })

    it('finds the city in the lists of the form, so that choosing it there selects the same place', async () => {
      const locations = fakeLocations()
      const result = await resolveAddress(LAHUG_HINT, locations)
      expect(await locations.cities(result.province?.code ?? '')).toContainEqual(result.city)
      expect(await locations.barangays(result.city?.code ?? '')).toContainEqual(result.barangay)
    })

    it('gives the province and city, and no barangay, when the names fit none', async () => {
      const result = await resolveAddress(hint({ ...city('Cebu City'), areas: ['Colon', 'Señor Santo Niño'] }), fakeLocations())
      expect(result).toStrictEqual({ province: CEBU, city: CEBU_CITY })
    })

    it('gives no barangay when the names point to different ones', async () => {
      const result = await resolveAddress(hint({ ...city('Cebu City'), areas: ['Lahug', 'Adlaon'] }), fakeLocations())
      expect(result).toStrictEqual({ province: CEBU, city: CEBU_CITY })
      expect(result.barangay).toBeUndefined()
    })

    it('gives the barangay that fits, among names that do not', async () => {
      const result = await resolveAddress(hint({ ...city('Cebu City'), areas: ['Diliman', 'Adlaon', 'Some Village'] }), fakeLocations())
      expect(result.barangay).toStrictEqual(ADLAON)
    })

    it('finds a municipality by the name of a town', async () => {
      const result = await resolveAddress(hint({ ...city('Alcantara', 'town'), areas: ['Poblacion'] }), fakeLocations())
      expect(result).toStrictEqual({ province: CEBU, city: ALCANTARA, barangay: POBLACION })
    })

    it('puts a Metro Manila city in Metro Manila, which the map does not name', async () => {
      const result = await resolveAddress(hint({ ...city('Manila'), isoRegion: 'PH-00', region: 'Metro Manila' }), fakeLocations())
      expect(result).toStrictEqual({ province: METRO_MANILA, city: MANILA })
    })

    it('uses the province the map names to tell cities apart', async () => {
      const locations = fakeLocationsWithRepeatedNames()
      const result = await resolveAddress(hint({ ...city('San Fernando'), state: 'La Union' }), locations)
      expect(result).toStrictEqual({
        province: LA_UNION,
        city: { code: SAN_FERNANDO_LA_UNION.code, name: SAN_FERNANDO_LA_UNION.name },
      })
    })
  })

  describe('a real answer for Manila', () => {
    it('fills the barangay that Manila gives as a city block, next to the district', async () => {
      const hint = readHint(INTRAMUROS_ANSWER)
      if (typeof hint === 'string') throw new Error('expected a hint')
      const barangay655 = { code: '133909002', name: 'Barangay 655' }
      const barangays = [{ code: '133909001', name: 'Barangay 654' }, barangay655, { code: '133909003', name: 'Barangay 656' }]
      const locations = fakeLocations({ barangays: async (cityCode) => (cityCode === MANILA.code ? barangays : []) })

      await expect(resolveAddress(hint, locations)).resolves.toStrictEqual({
        province: METRO_MANILA,
        city: MANILA,
        barangay: barangay655,
        street: '470 General Luna Street',
      })
    })
  })

  describe('the lists', () => {
    it('asks for the barangays of the city that matched, and only that one', async () => {
      const barangays = vi.fn(async () => [LAHUG])
      await resolveAddress(LAHUG_HINT, fakeLocations({ barangays }))
      expect(barangays).toHaveBeenCalledTimes(1)
      expect(barangays).toHaveBeenCalledWith(CEBU_CITY.code)
    })

    it('does not ask for the barangays when no city matched', async () => {
      const barangays = vi.fn(async () => [LAHUG])
      await resolveAddress(hint(city('Atlantis')), fakeLocations({ barangays }))
      await resolveAddress(hint({ ...city('San Fernando') }), fakeLocationsWithRepeatedNames({ barangays }))
      expect(barangays).not.toHaveBeenCalled()
    })

    it('keeps the province and city when the barangays cannot be loaded', async () => {
      const locations = fakeLocations({ barangays: () => Promise.reject(new Error('down')) })
      await expect(resolveAddress(LAHUG_HINT, locations)).resolves.toStrictEqual({
        province: CEBU,
        city: CEBU_CITY,
        street: '12 Salinas Drive',
      })
    })

    it('rejects when the list of cities cannot be loaded', async () => {
      const locations = fakeLocations({ allCities: () => Promise.reject(new Error('down')) })
      await expect(resolveAddress(LAHUG_HINT, locations)).rejects.toThrow('down')
    })

    it('rejects when the list of provinces cannot be loaded', async () => {
      const locations = fakeLocations({ provinces: () => Promise.reject(new Error('down')) })
      await expect(resolveAddress(LAHUG_HINT, locations)).rejects.toThrow('down')
      await expect(resolveAddress(hint({ state: 'Cebu' }), locations)).rejects.toThrow('down')
    })

    it('asks for each list once', async () => {
      const locations = fakeLocations({
        provinces: vi.fn(async () => [CEBU, ILOCOS_NORTE, METRO_MANILA]),
        allCities: vi.fn(async () => [...CITY_REFS]),
      })
      await resolveAddress(LAHUG_HINT, locations)
      expect(locations.provinces).toHaveBeenCalledTimes(1)
      expect(locations.allCities).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the city is not found or fits several places', () => {
    it('gives the province the map names, on its own', async () => {
      const result = await resolveAddress(hint({ ...city('Atlantis'), state: 'Cebu', areas: ['Lahug'] }), fakeLocations())
      expect(result).toStrictEqual({ province: CEBU })
    })

    it('gives the province alone when the map names a province and no city, as for Laoag', async () => {
      const locations = fakeLocations({ allCities: vi.fn(async () => [...CITY_REFS]) })
      const result = await resolveAddress(hint({ state: 'Ilocos Norte', areas: ['Barangay 8'], road: 'Governor Primo Lazaro Street' }), locations)
      expect(result).toStrictEqual({ province: ILOCOS_NORTE, street: 'Governor Primo Lazaro Street' })
      // The big list is for finding a city by name. With no name there is no use for it.
      expect(locations.allCities).not.toHaveBeenCalled()
    })

    it('gives the province alone when the name fits several places and the province decides nothing', async () => {
      const locations = fakeLocationsWithRepeatedNames()
      const result = await resolveAddress(hint({ ...city('San Fernando'), state: 'Ilocos Norte' }), locations)
      expect(result).toStrictEqual({ province: ILOCOS_NORTE })
    })

    it('gives nothing when the name fits several places and the map names no province', async () => {
      await expect(resolveAddress(hint(city('San Fernando')), fakeLocationsWithRepeatedNames())).resolves.toStrictEqual({})
    })

    it('gives nothing for a province the lists do not know', async () => {
      await expect(resolveAddress(hint({ ...city('Atlantis'), state: 'Atlantis' }), fakeLocations())).resolves.toStrictEqual({})
    })

    it('does not guess the barangay of a city it could not find', async () => {
      const result = await resolveAddress(hint({ ...city('Atlantis'), state: 'Cebu', areas: ['Lahug', 'Poblacion'] }), fakeLocations())
      expect(result.barangay).toBeUndefined()
      expect(result.city).toBeUndefined()
    })
  })

  describe('a spot with nothing to go on', () => {
    it('gives nothing, and loads no list', async () => {
      const locations = fakeLocations({
        provinces: vi.fn(async () => [CEBU]),
        allCities: vi.fn(async () => [...CITY_REFS]),
        barangays: vi.fn(async () => []),
      })
      await expect(resolveAddress(hint(), locations)).resolves.toStrictEqual({})
      await expect(resolveAddress(hint({ road: 'Salinas Drive', areas: ['Lahug'] }), locations)).resolves.toStrictEqual({})
      expect(locations.provinces).not.toHaveBeenCalled()
      expect(locations.allCities).not.toHaveBeenCalled()
      expect(locations.barangays).not.toHaveBeenCalled()
    })
  })

  describe('the street', () => {
    /** The street that comes out for a road and a house number, for a spot in Cebu City. */
    async function streetOf(road: string | undefined, houseNumber?: string): Promise<string | undefined> {
      const spot: AddressHint = { ...city('Cebu City'), areas: [] }
      if (road !== undefined) spot.road = road
      if (houseNumber !== undefined) spot.houseNumber = houseNumber
      return (await resolveAddress(spot, fakeLocations())).street
    }

    it('is the house number and the road', async () => {
      expect(await streetOf('General Luna Street', '470')).toBe('470 General Luna Street')
    })

    it('is the road when there is no house number, or an empty one', async () => {
      expect(await streetOf('Salinas Drive')).toBe('Salinas Drive')
      expect(await streetOf('Salinas Drive', '')).toBe('Salinas Drive')
    })

    it('is missing when there is a house number and no road, or neither', async () => {
      expect(await streetOf(undefined, '12')).toBeUndefined()
      expect(await streetOf(undefined)).toBeUndefined()
      expect(await streetOf('')).toBeUndefined()
    })

    it('keeps what the street rules allow', async () => {
      const road = "Governor's Rd. (C-5), #12/B & Sons"
      expect(await streetOf(road)).toBe(road)
    })

    it('turns what the street rules refuse into spaces, and tidies the rest', async () => {
      expect(await streetOf('Quezon–Aurora  Road;')).toBe('Quezon Aurora Road')
      expect(await streetOf('Salinas <b>Drive</b>')).toBe('Salinas b Drive /b')
      expect(await streetOf('Salinas\u0000\tDrive')).toBe('Salinas Drive')
    })

    it('never has a character that the street rules refuse', async () => {
      for (const road of ['<script>alert(1)</script>', 'a\u202eb\u200bc', 'Rizal "Ave"', 'Dr. J. P. Laurel; Hwy', '日本語 Street', 'x@y.z Road', 'A+B=C Road']) {
        const street = await streetOf(road, '7')
        expect(street).toBeDefined()
        expect(PLACE_NAME.pattern.test(street ?? '')).toBe(true)
        expect(street?.length).toBeGreaterThanOrEqual(3)
        expect(street?.length).toBeLessThanOrEqual(120)
      }
    })

    it('is missing when too little is left (the rule asks for 3 characters)', async () => {
      expect(await streetOf('12')).toBeUndefined()
      expect(await streetOf('– –')).toBeUndefined()
      expect(await streetOf('EDSA')).toBe('EDSA')
      expect(await streetOf('Ab', '1')).toBe('1 Ab')
    })

    it('keeps a street of exactly 3 characters, such as the road C-5, the shortest the rule accepts', async () => {
      expect(await streetOf('C-5')).toBe('C-5')
      expect(await streetOf('C', '5')).toBe('5 C')
    })

    it('is missing when it is too long (the rule allows 120 characters)', async () => {
      const long = 'x'.repeat(100)
      expect(await streetOf(long)).toBe(long)
      expect(await streetOf(long, 'y'.repeat(19))).toHaveLength(120)
      expect(await streetOf(long, 'y'.repeat(20))).toBeUndefined()
    })

    it('goes with a province when only the province was found', async () => {
      const result = await resolveAddress(hint({ state: 'Cebu', road: 'Salinas Drive' }), fakeLocations())
      expect(result).toStrictEqual({ province: CEBU, street: 'Salinas Drive' })
    })

    it('does not go alone: a result with no place in it is empty', async () => {
      const result = await resolveAddress(hint({ ...city('Atlantis'), road: 'Salinas Drive' }), fakeLocations())
      expect(result).toStrictEqual({})
    })
  })

  describe('as a function', () => {
    it('gives the same answer twice and keeps nothing between calls', async () => {
      const locations = fakeLocations()
      const first = await resolveAddress(LAHUG_HINT, locations)
      const second = await resolveAddress(LAHUG_HINT, locations)
      expect(second).toStrictEqual(first)
      // A different list gives a different answer: nothing was remembered from the first call.
      const other = fakeLocations({ allCities: async () => [] })
      await expect(resolveAddress(LAHUG_HINT, other)).resolves.toStrictEqual({})
    })

    it('does not change the hint or the lists', async () => {
      const frozen = Object.freeze({
        ...LAHUG_HINT,
        areas: Object.freeze([...LAHUG_HINT.areas]) as string[],
        settlement: Object.freeze({ name: 'Cebu City', kind: 'city' as const }),
      })
      const provinces: readonly Place[] = Object.freeze([CEBU, ILOCOS_NORTE, METRO_MANILA])
      const cities = Object.freeze(CITY_REFS.map((ref) => Object.freeze({ ...ref })))
      const locations = fakeLocations({ provinces: async () => [...provinces], allCities: async () => [...cities] })
      await expect(resolveAddress(frozen, locations)).resolves.toMatchObject({ city: CEBU_CITY })
    })

    it('does not share an object with the lists, so a caller cannot change them', async () => {
      const result = await resolveAddress(LAHUG_HINT, fakeLocations())
      expect(result.province).not.toBe(CEBU)
      expect(result.city).not.toBe(CEBU_CITY)
      expect(result.barangay).not.toBe(LAHUG)
    })

    it('uses the cities of the lists, so a list that names Laoag finds Laoag', async () => {
      const result = await resolveAddress(hint({ ...city('Laoag'), state: 'Ilocos Norte' }), fakeLocations())
      expect(result).toStrictEqual({ province: ILOCOS_NORTE, city: LAOAG })
    })
  })
})

import { describe, expect, it } from 'vitest'
import { CEBU, CITY_REFS, fakeLocations, fakeLocationsWithRepeatedNames, ILOCOS_NORTE, METRO_MANILA } from './locations'

// Other tests lean on these stand-ins, so they must agree with each other the way the real lists do.
describe.each([
  ['fakeLocations', fakeLocations],
  ['fakeLocationsWithRepeatedNames', fakeLocationsWithRepeatedNames],
])('%s', (_, make) => {
  it('lists every city of allCities in the cities of its province, with the same code and name', async () => {
    const locations = make()
    const all = await locations.allCities()
    expect(all.length).toBeGreaterThanOrEqual(CITY_REFS.length)
    for (const ref of all) {
      expect(await locations.cities(ref.provinceCode)).toContainEqual({ code: ref.code, name: ref.name })
    }
  })

  it('has the province of every city in the list of provinces', async () => {
    const locations = make()
    const codes = (await locations.provinces()).map((province) => province.code)
    for (const ref of await locations.allCities()) expect(codes).toContain(ref.provinceCode)
  })

  it('has a city in no province twice', async () => {
    const all = await make().allCities()
    expect(new Set(all.map((city) => city.code)).size).toBe(all.length)
  })

  it('hands out a new list each time, so a test that changes it does not change the next', async () => {
    const locations = make()
    const first = await locations.allCities()
    first.pop()
    expect(await locations.allCities()).toHaveLength(first.length + 1)
  })

  it('lets a test replace any one list', async () => {
    const locations = make({ allCities: async () => [] })
    expect(await locations.allCities()).toEqual([])
    expect(await locations.provinces()).not.toHaveLength(0)
  })
})

describe('fakeLocations', () => {
  it('keeps the lists the form tests count', async () => {
    const locations = fakeLocations()
    expect(await locations.provinces()).toEqual([CEBU, ILOCOS_NORTE, METRO_MANILA])
    expect((await locations.cities(CEBU.code)).map((city) => city.name)).toEqual(['Alcantara', 'Cebu City'])
    expect((await locations.cities(ILOCOS_NORTE.code)).map((city) => city.name)).toEqual(['Laoag City'])
    expect((await locations.cities(METRO_MANILA.code)).map((city) => city.name)).toEqual(['Manila City'])
  })
})

describe('fakeLocationsWithRepeatedNames', () => {
  it('has four places called San Fernando, in four provinces', async () => {
    const names = (await fakeLocationsWithRepeatedNames().allCities()).filter((city) => city.name.startsWith('San Fernando'))
    expect(names).toHaveLength(4)
    expect(new Set(names.map((city) => city.provinceCode)).size).toBe(4)
  })

  it('keeps the default lists apart from it', async () => {
    expect(await fakeLocations().allCities()).toHaveLength(CITY_REFS.length)
  })
})

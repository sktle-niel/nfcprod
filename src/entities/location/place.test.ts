import { describe, expect, it } from 'vitest'
import { PLACE_NAME } from '@/entities/order/validate'
import { isPlaceCode, METRO_MANILA_CODE, parseCityRefs, parsePlaces, sortPlaces, toPlaceName } from './place'

describe('toPlaceName', () => {
  it.each(['Dasmariñas', 'Barangay 659-A', 'Santo Niño (Pob.)', "Sta. Cruz / D'Lanuza", 'Zone 1 & 2, Pob.'])(
    'keeps the official name "%s" as it is',
    (name) => {
      expect(toPlaceName(name)).toBe(name)
    },
  )

  it('trims and collapses spaces, like the order form does', () => {
    expect(toPlaceName('Lahug (Pob.) ')).toBe('Lahug (Pob.)')
    expect(toPlaceName('  San   Jose\n(Pob.) ')).toBe('San Jose (Pob.)')
  })

  it('writes "City of Cebu" the way people say it', () => {
    expect(toPlaceName('City of Cebu ')).toBe('Cebu City')
    expect(toPlaceName('City of Las Piñas')).toBe('Las Piñas City')
    expect(toPlaceName('city of  Isabela')).toBe('Isabela City')
    expect(toPlaceName('Quezon City')).toBe('Quezon City')
    expect(toPlaceName('Cityof Nowhere')).toBe('Cityof Nowhere')
  })

  it('drops the asterisk the PSA puts after a few barangays', () => {
    expect(toPlaceName('Fuentes*')).toBe('Fuentes')
  })

  it('leaves nothing that the order rules would refuse', () => {
    for (const raw of ['Poblacion [East]', 'Lawis <script>', 'Bayan – Sentro', 'Mabini\u0000 (Pob.)', 'ＡＢＣ Village']) {
      const name = toPlaceName(raw)
      expect(name).not.toBeNull()
      expect(PLACE_NAME.pattern.test(name ?? '')).toBe(true)
    }
  })

  it('gives up on anything that is not a usable name', () => {
    expect(toPlaceName(null)).toBeNull()
    expect(toPlaceName(42)).toBeNull()
    expect(toPlaceName('*')).toBeNull()
    expect(toPlaceName('***')).toBeNull()
    expect(toPlaceName('A')).toBeNull()
    expect(toPlaceName('x'.repeat(PLACE_NAME.max + 1))).toBeNull()
    expect(toPlaceName('x'.repeat(PLACE_NAME.max))).toBe('x'.repeat(PLACE_NAME.max))
  })
})

describe('isPlaceCode', () => {
  it('accepts 9 or 10 digits', () => {
    expect(isPlaceCode('072200000')).toBe(true)
    expect(isPlaceCode('0702200000')).toBe(true)
  })

  it.each(['', '12345678', '12345678901', '07220000a', '../../x', '072200000\n', ' 072200000', 72200000, null])(
    'refuses %j, because it must never reach a URL',
    (value) => {
      expect(isPlaceCode(value)).toBe(false)
    },
  )
})

describe('sortPlaces', () => {
  const place = (code: string, name: string) => ({ code, name })

  it('sorts by name and counts numbers as numbers', () => {
    const sorted = sortPlaces([
      place('1', 'Dumaguete'),
      place('2', 'Cebu City'),
      place('3', 'Barangay 10'),
      place('4', 'Barangay 2'),
      place('5', 'Alcoy'),
    ])
    expect(sorted.map((item) => item.name)).toEqual(['Alcoy', 'Barangay 2', 'Barangay 10', 'Cebu City', 'Dumaguete'])
  })

  it('does not change the list it was given', () => {
    const list = [place('1', 'B'), place('2', 'A')]
    sortPlaces(list)
    expect(list.map((item) => item.name)).toEqual(['B', 'A'])
  })
})

describe('parsePlaces', () => {
  it('reads code and name and ignores every other field', () => {
    expect(parsePlaces([{ code: '072200000', name: 'Cebu', regionCode: '070000000', extra: { a: 1 } }])).toEqual([
      { code: '072200000', name: 'Cebu' },
    ])
  })

  it('sorts the list', () => {
    const places = parsePlaces([
      { code: '000000002', name: 'Zamboanga' },
      { code: '000000001', name: 'Abra' },
    ])
    expect(places?.map((item) => item.name)).toEqual(['Abra', 'Zamboanga'])
  })

  it('drops what is not a place and keeps the rest', () => {
    const places = parsePlaces([
      { code: '072200000', name: 'Cebu' },
      { code: '../etc', name: 'Hacker' },
      { code: '012800000', name: '***' },
      { code: 12, name: 'Number code' },
      null,
      'text',
      { name: 'No code' },
    ])
    expect(places).toEqual([{ code: '072200000', name: 'Cebu' }])
  })

  it('keeps the first of two entries with the same code', () => {
    const places = parsePlaces([
      { code: '072200000', name: 'Cebu' },
      { code: '072200000', name: 'Cebu again' },
    ])
    expect(places).toEqual([{ code: '072200000', name: 'Cebu' }])
  })

  it('accepts an empty list', () => {
    expect(parsePlaces([])).toEqual([])
  })

  it.each([null, undefined, 'x', 7, {}, { data: [] }])('says %j is not a list', (value) => {
    expect(parsePlaces(value)).toBeNull()
  })

  it('says a list is not usable when nothing in it is', () => {
    expect(parsePlaces([{ nombre: 'Cebu', codigo: '072200000' }])).toBeNull()
  })

  it('refuses a list far bigger than any real one', () => {
    const huge = Array.from({ length: 5001 }, (_, index) => ({ code: String(index).padStart(9, '0'), name: `Place ${index}` }))
    expect(parsePlaces(huge)).toBeNull()
  })
})

describe('parseCityRefs', () => {
  // One item the way the PSGC API writes it, with the fields we do not use.
  const api = (extra: Record<string, unknown> = {}) => ({
    code: '072217000',
    name: 'City of Cebu',
    oldName: '',
    isCapital: false,
    isCity: true,
    isMunicipality: false,
    provinceCode: '072200000',
    districtCode: false,
    regionCode: '070000000',
    islandGroupCode: 'visayas',
    psgc10DigitCode: '0702217000',
    ...extra,
  })
  const CEBU_CITY = { code: '072217000', name: 'Cebu City', provinceCode: '072200000', regionCode: '070000000', isCity: true }
  const left = new Map([['099701000', '150700000']])

  it('reads the code, the name, the province, the region and whether it is a city, and nothing else', () => {
    expect(parseCityRefs([api()])).toEqual([CEBU_CITY])
  })

  it('writes the name the way the lists do', () => {
    expect(parseCityRefs([api({ name: 'City of Las Piñas ' })])?.[0]?.name).toBe('Las Piñas City')
    expect(parseCityRefs([api({ name: 'Fuentes*' })])?.[0]?.name).toBe('Fuentes')
  })

  it('tells a municipality from a city', () => {
    const municipality = api({ code: '072201000', name: 'Alcantara', isCity: false, isMunicipality: true })
    expect(parseCityRefs([municipality])?.[0]).toMatchObject({ name: 'Alcantara', isCity: false })
  })

  it('gives the cities of Metro Manila, which have no province, the code Metro Manila goes by', () => {
    const makati = api({ code: '137602000', name: 'City of Makati', provinceCode: false, regionCode: METRO_MANILA_CODE })
    expect(parseCityRefs([makati])).toEqual([
      { code: '137602000', name: 'Makati City', provinceCode: METRO_MANILA_CODE, regionCode: METRO_MANILA_CODE, isCity: true },
    ])
    expect(METRO_MANILA_CODE).toBe('130000000')
  })

  it('puts a left-out city in the province that is given for it', () => {
    const isabela = api({ code: '099701000', name: 'City of Isabela', provinceCode: false, regionCode: '090000000' })
    expect(parseCityRefs([isabela], left)).toEqual([
      { code: '099701000', name: 'Isabela City', provinceCode: '150700000', regionCode: '090000000', isCity: true },
    ])
  })

  it('drops a city with no province when nothing says where it belongs', () => {
    const isabela = api({ code: '099701000', name: 'City of Isabela', provinceCode: false, regionCode: '090000000' })
    expect(parseCityRefs([isabela, api()])).toEqual([CEBU_CITY])
  })

  it('uses the province the API gives, even for a city we have a fallback for', () => {
    const isabela = api({ code: '099701000', name: 'City of Isabela', provinceCode: '150700000', regionCode: '090000000' })
    const other = new Map([['099701000', '999999999']])
    expect(parseCityRefs([isabela], other)?.[0]?.provinceCode).toBe('150700000')
  })

  it.each([
    ['a code that is not a code', { code: '../etc' }],
    ['no code', { code: undefined }],
    ['a code that is a number', { code: 72217000 }],
    ['a name that is not a name', { name: '***' }],
    ['a name that is not text', { name: 42 }],
    ['a region that is not a code', { regionCode: '../x' }],
    ['no region', { regionCode: undefined }],
    ['an isCity that is text', { isCity: 'true' }],
    ['an isCity that is a number', { isCity: 1 }],
    ['no isCity', { isCity: undefined }],
    ['a province that is not a code', { provinceCode: '../x' }],
    ['a province that is a number', { provinceCode: 72200000 }],
    ['a province that is null', { provinceCode: null }],
    ['no province', { provinceCode: undefined }],
  ])('drops an item with %s and keeps the rest', (_, bad) => {
    const good = api({ code: '072201000', name: 'Alcantara', isCity: false })
    const places = parseCityRefs([api(bad), good])
    expect(places?.map((place) => place.code)).toEqual(['072201000'])
  })

  it('drops what is not an item at all', () => {
    expect(parseCityRefs([null, 'text', 7, [], api()])).toEqual([CEBU_CITY])
  })

  it('keeps the first of two items with the same code', () => {
    const places = parseCityRefs([api(), api({ name: 'Somewhere else' })])
    expect(places).toEqual([CEBU_CITY])
  })

  it('sorts by name and counts numbers as numbers', () => {
    const places = parseCityRefs([
      api({ code: '000000003', name: 'Zone 10' }),
      api({ code: '000000002', name: 'Zone 2' }),
      api({ code: '000000001', name: 'Alcoy', isCity: false }),
    ])
    expect(places?.map((place) => place.name)).toEqual(['Alcoy', 'Zone 2', 'Zone 10'])
  })

  it('accepts an empty list', () => {
    expect(parseCityRefs([])).toEqual([])
  })

  it.each([null, undefined, 'x', 7, {}, { data: [] }])('says %j is not a list', (value) => {
    expect(parseCityRefs(value)).toBeNull()
  })

  it('says a list is not usable when nothing in it is', () => {
    expect(parseCityRefs([{ codigo: '072217000', nombre: 'Cebu' }])).toBeNull()
    expect(parseCityRefs([api({ isCity: 'yes' })])).toBeNull()
  })

  it('refuses a list far bigger than any real one', () => {
    const huge = Array.from({ length: 5001 }, (_, index) => api({ code: String(index).padStart(9, '0'), name: `Place ${index}` }))
    expect(parseCityRefs(huge)).toBeNull()
    expect(parseCityRefs(huge.slice(0, 5000))).toHaveLength(5000)
  })

  it('reads a list the size of the real one quickly', () => {
    const real = Array.from({ length: 1634 }, (_, index) => api({ code: String(100000000 + index), name: `City of Place ${index}` }))
    const started = performance.now()
    expect(parseCityRefs(real)).toHaveLength(1634)
    expect(performance.now() - started).toBeLessThan(500)
  })
})

describe('sortPlaces keeps what is on the places', () => {
  it('returns the same kind of item it was given', () => {
    const sorted = sortPlaces([
      { code: '2', name: 'B', provinceCode: 'p', regionCode: 'r', isCity: true },
      { code: '1', name: 'A', provinceCode: 'p', regionCode: 'r', isCity: false },
    ])
    expect(sorted.map((city) => city.isCity)).toEqual([false, true])
  })
})

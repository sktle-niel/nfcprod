import { describe, expect, it } from 'vitest'
import { PLACE_NAME } from '@/entities/order/validate'
import { isPlaceCode, parsePlaces, sortPlaces, toPlaceName } from './place'

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

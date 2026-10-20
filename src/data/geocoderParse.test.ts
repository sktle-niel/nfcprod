import { describe, expect, it } from 'vitest'
import { INTRAMUROS_ANSWER } from '@/test/geocoder'
import type { SearchHit } from './geocoder'
import { readHint, readHits } from './geocoderParse'

// Answers as Nominatim wrote them for real spots (trimmed to the parts that matter).
const IT_PARK = {
  place_id: 261064440,
  display_name: 'Cebu I.T. Park, Kasambagan, Cebu City, Central Visayas, 6000, Philippines',
  address: {
    commercial: 'Cebu I.T. Park',
    suburb: 'Kasambagan',
    city: 'Cebu City',
    region: 'Central Visayas',
    'ISO3166-2-lvl3': 'PH-07',
    postcode: '6000',
    country: 'Philippines',
    country_code: 'ph',
  },
}

const MAKATI = {
  address: {
    road: 'Makati Avenue',
    quarter: 'Urdaneta',
    city_district: 'District I',
    city: 'Makati',
    state_district: 'Southern Manila District',
    region: 'Metro Manila',
    'ISO3166-2-lvl3': 'PH-00',
    postcode: '1226',
    country_code: 'ph',
  },
}

const SIBUTU = {
  address: {
    village: 'Nunukan',
    town: 'Sibutu',
    state: 'Tawi-Tawi',
    region: 'Bangsamoro',
    'ISO3166-2-lvl3': 'PH-14',
    country_code: 'ph',
  },
}

/** An answer with this address, in the Philippines. */
const inPh = (address: Record<string, unknown>) => ({ address: { country_code: 'ph', ...address } })

describe('readHint', () => {
  it('reads a spot in a city', () => {
    expect(readHint(IT_PARK)).toEqual({
      region: 'Central Visayas',
      isoRegion: 'PH-07',
      settlement: { name: 'Cebu City', kind: 'city' },
      areas: ['Kasambagan'],
    })
  })

  it('reads the road, the area and the region of a Metro Manila spot, which has no province', () => {
    const hint = readHint(MAKATI)
    expect(hint).toEqual({
      region: 'Metro Manila',
      isoRegion: 'PH-00',
      settlement: { name: 'Makati', kind: 'city' },
      areas: ['Urdaneta'],
      road: 'Makati Avenue',
    })
    expect(hint).not.toHaveProperty('state')
  })

  it('reads a spot in a town with its province', () => {
    expect(readHint(SIBUTU)).toEqual({
      state: 'Tawi-Tawi',
      region: 'Bangsamoro',
      isoRegion: 'PH-14',
      settlement: { name: 'Sibutu', kind: 'town' },
      areas: ['Nunukan'],
    })
  })

  it('reads the house number with the road', () => {
    expect(readHint(inPh({ road: 'General Luna Street', house_number: '470' }))).toEqual({
      areas: [],
      road: 'General Luna Street',
      houseNumber: '470',
    })
  })

  describe('the city', () => {
    it('is the city, else the town, else the municipality', () => {
      expect(readHint(inPh({ city: 'A', town: 'B', municipality: 'C' }))).toMatchObject({ settlement: { name: 'A', kind: 'city' } })
      expect(readHint(inPh({ town: 'B', municipality: 'C' }))).toMatchObject({ settlement: { name: 'B', kind: 'town' } })
      expect(readHint(inPh({ municipality: 'C' }))).toMatchObject({ settlement: { name: 'C', kind: 'town' } })
    })

    it('is missing when the map gives none, as for Laoag, where only the province is known', () => {
      const hint = readHint(inPh({ state: 'Ilocos Norte', county: 'Brgy. 13', quarter: 'Barangay 8' }))
      expect(hint).toEqual({ state: 'Ilocos Norte', areas: ['Barangay 8'] })
      expect(hint).not.toHaveProperty('settlement')
    })

    it('falls to the next key when one is empty or not text', () => {
      expect(readHint(inPh({ city: '  ', town: 'B' }))).toMatchObject({ settlement: { name: 'B', kind: 'town' } })
      expect(readHint(inPh({ city: 5, town: null, municipality: 'C' }))).toMatchObject({ settlement: { name: 'C', kind: 'town' } })
    })
  })

  describe('the areas', () => {
    it('are the village, suburb, quarter, neighbourhood, city block and hamlet, in that order', () => {
      const hint = readHint(
        inPh({ hamlet: 'f', city_block: 'e', neighbourhood: 'd', quarter: 'c', suburb: 'b', village: 'a' }),
      )
      expect(hint).toMatchObject({ areas: ['a', 'b', 'c', 'd', 'e', 'f'] })
    })

    it('include the city block, where Manila gives the barangay: Intramuros is the district and Barangay 655 the barangay', () => {
      expect(readHint(INTRAMUROS_ANSWER)).toEqual({
        region: 'Metro Manila',
        isoRegion: 'PH-00',
        settlement: { name: 'Manila', kind: 'city' },
        areas: ['Intramuros', 'Barangay 655'],
        road: 'General Luna Street',
        houseNumber: '470',
      })
    })

    it('leave out the keys that do not name a barangay', () => {
      const hint = readHint(inPh({ city_district: 'District I', county: 'X', state_district: 'Y', borough: 'Z', suburb: 'b' }))
      expect(hint).toMatchObject({ areas: ['b'] })
    })

    it('are listed once', () => {
      expect(readHint(inPh({ suburb: 'Poblacion', quarter: 'Poblacion', neighbourhood: 'Poblacion', city_block: 'Poblacion' }))).toMatchObject({
        areas: ['Poblacion'],
      })
    })

    it('are empty when the map names none', () => {
      expect(readHint(inPh({ city: 'Manila' }))).toMatchObject({ areas: [] })
    })
  })

  describe('a spot with no address', () => {
    it('is not a failure: the sea is answered with an error text and a 200', () => {
      expect(readHint({ error: 'Unable to geocode' })).toEqual({ areas: [] })
      expect(readHint({ error: { code: 400, message: 'Unable to geocode' } })).toEqual({ areas: [] })
    })
  })

  describe('another country', () => {
    it('is outside', () => {
      expect(readHint({ address: { country_code: 'my', city: 'Sandakan' } })).toBe('outside')
      expect(readHint({ address: { country_code: 'sg' } })).toBe('outside')
    })

    it('is outside when the country is missing or not text', () => {
      expect(readHint({ address: { city: 'Manila' } })).toBe('outside')
      expect(readHint({ address: { country_code: 63, city: 'Manila' } })).toBe('outside')
      expect(readHint({ address: { country_code: null } })).toBe('outside')
      expect(readHint({ address: { country_code: ['ph'] } })).toBe('outside')
    })

    it('does not mind the case or the spaces of the code', () => {
      expect(readHint({ address: { country_code: ' PH ', city: 'Manila' } })).toMatchObject({ settlement: { name: 'Manila' } })
    })
  })

  describe('an answer that does not look like one', () => {
    it.each([
      ['nothing', null],
      ['nothing at all', undefined],
      ['text', 'Rate limit exceeded'],
      ['a number', 7],
      ['a list', [IT_PARK]],
      ['an empty object', {}],
      ['an object with no address', { place_id: 1 }],
      ['an address that is text', { address: 'Cebu City' }],
      ['an address that is a list', { address: [{ country_code: 'ph' }] }],
      ['an address that is null', { address: null }],
    ])('is unavailable when it is %s', (_, body) => {
      expect(readHint(body)).toBe('unavailable')
    })
  })

  describe('the text in it', () => {
    it('is trimmed, and has its spaces and control characters tidied', () => {
      const hint = readHint(inPh({ city: '  Cebu\t\nCity ', suburb: 'Lahug\u0000\u0007', road: 'Salinas   Drive' }))
      expect(hint).toMatchObject({ settlement: { name: 'Cebu City' }, areas: ['Lahug'], road: 'Salinas Drive' })
    })

    it('is cut to 100 characters', () => {
      const long = 'a'.repeat(250)
      const hint = readHint(inPh({ city: long, suburb: long, road: long, state: long, region: long }))
      if (typeof hint === 'string') throw new Error('expected a hint')
      expect(hint.settlement?.name).toHaveLength(100)
      expect(hint.areas[0]).toHaveLength(100)
      expect(hint.road).toHaveLength(100)
      expect(hint.state).toHaveLength(100)
      expect(hint.region).toHaveLength(100)
    })

    it('keeps exactly 100 characters, and does not cut a character in half', () => {
      const hint = readHint(inPh({ suburb: '😀'.repeat(150) }))
      if (typeof hint === 'string') throw new Error('expected a hint')
      const [area] = hint.areas
      expect(Array.from(area ?? '')).toHaveLength(100)
      expect(area).toBe('😀'.repeat(100))
      expect(readHint(inPh({ suburb: 'x'.repeat(100) }))).toMatchObject({ areas: ['x'.repeat(100)] })
    })

    it('leaves out what is not text or is empty', () => {
      const hint = readHint(
        inPh({ city: 5, suburb: {}, quarter: ['Lahug'], neighbourhood: '   ', hamlet: null, road: false, house_number: 12, state: '', region: undefined }),
      )
      expect(hint).toEqual({ areas: [] })
    })

    it('stays text, so that it can only be compared: markup is not touched', () => {
      const hint = readHint(inPh({ suburb: '<img src=x onerror=alert(1)>', city: '"><script>alert(1)</script>' }))
      expect(hint).toMatchObject({
        areas: ['<img src=x onerror=alert(1)>'],
        settlement: { name: '"><script>alert(1)</script>', kind: 'city' },
      })
    })

    it('adds nothing that was not asked for', () => {
      const hint = readHint(inPh({ city: 'Manila', display_name: 'x', extratags: { a: 1 }, polygon: [1, 2] }))
      expect(Object.keys(hint as object).sort()).toEqual(['areas', 'settlement'])
    })

    it('is not fooled by keys that every object has', () => {
      const body: unknown = JSON.parse('{"address":{"country_code":"ph","__proto__":{"city":"Evil"},"constructor":"x"}}')
      expect(readHint(body)).toEqual({ areas: [] })
      expect(({} as { city?: string }).city).toBeUndefined()
    })
  })
})

/** The places of an answer that must be a list. */
function placesOf(body: unknown): SearchHit[] {
  const hits = readHits(body)
  if (hits === 'unavailable') throw new Error('expected a list of places')
  return hits
}

describe('readHits', () => {
  const hit = (label: unknown, lat: unknown, lon: unknown, extra: Record<string, unknown> = {}) => ({
    place_id: 1,
    display_name: label,
    lat,
    lon,
    ...extra,
  })
  const CEBU = { label: 'Cebu', pin: { lat: 10.3, lng: 123.9 } }

  it('reads the places, turning the text numbers of Nominatim into numbers', () => {
    const hits = placesOf([
      hit('Lahug, Cebu City, Central Visayas, 6000, Philippines', '10.3280553', '123.9059107'),
      hit('Lahug, Mandaue, Central Visayas, Philippines', '10.3400000', '123.9500000'),
    ])
    expect(hits).toEqual([
      { label: 'Lahug, Cebu City, Central Visayas, 6000, Philippines', pin: { lat: 10.32806, lng: 123.90591 } },
      { label: 'Lahug, Mandaue, Central Visayas, Philippines', pin: { lat: 10.34, lng: 123.95 } },
    ])
  })

  it('also reads real numbers, as other services write them', () => {
    expect(placesOf([hit('Cebu', 10.3, 123.9)])).toEqual([CEBU])
  })

  it('gives an empty list for an empty answer', () => {
    expect(placesOf([])).toEqual([])
  })

  it('keeps five places at most', () => {
    const many = Array.from({ length: 9 }, (_, index) => hit(`Place ${index}`, '10.3', '123.9'))
    const hits = placesOf(many)
    expect(hits).toHaveLength(5)
    expect(hits.map((item) => item.label)).toEqual(['Place 0', 'Place 1', 'Place 2', 'Place 3', 'Place 4'])
  })

  it('counts only the places it keeps toward the five', () => {
    const items = [
      hit('Singapore', '1.35', '103.82'),
      ...Array.from({ length: 6 }, (_, index) => hit(`Place ${index}`, '10.3', '123.9')),
    ]
    expect(placesOf(items)).toHaveLength(5)
  })

  it('drops a place outside the Philippines', () => {
    const hits = placesOf([
      hit('Singapore', '1.35', '103.82'),
      hit('Null Island', '0', '0'),
      hit('Sibutu', '4.8', '119.47'),
      hit('Itbayat', '20.78', '121.84'),
    ])
    expect(hits.map((item) => item.label)).toEqual(['Sibutu', 'Itbayat'])
  })

  it.each([
    ['text that is not a number', 'abc', '123.9'],
    ['a number in hex', '0x0A', '123.9'],
    ['a number with an exponent', '1e1', '123.9'],
    ['a number with text after it', '10.3 north', '123.9'],
    ['an empty number', '', '123.9'],
    ['not a real number', Number.NaN, 123.9],
    ['infinity', Number.POSITIVE_INFINITY, 123.9],
    ['nothing', null, '123.9'],
    ['a list', ['10.3'], '123.9'],
    ['a missing number', undefined, '123.9'],
  ])('drops a place with %s as its latitude', (_, lat, lon) => {
    expect(placesOf([hit('Somewhere', lat, lon), hit('Cebu', '10.3', '123.9')])).toEqual([CEBU])
  })

  it('drops a place with a bad longitude', () => {
    expect(placesOf([hit('Somewhere', '10.3', 'east'), hit('Cebu', '10.3', '123.9')])).toEqual([CEBU])
  })

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['a number', 7],
    ['a list', ['Cebu']],
    ['missing', undefined],
  ])('drops a place whose label is %s', (_, label) => {
    expect(placesOf([hit(label, '10.3', '123.9')])).toEqual([])
  })

  it('cuts the label to 120 characters', () => {
    const [first] = placesOf([hit('a'.repeat(300), '10.3', '123.9')])
    expect(first?.label).toHaveLength(120)
  })

  it('tidies the label', () => {
    const [first] = placesOf([hit(' Lahug,\t Cebu\u0000  City ', '10.3', '123.9')])
    expect(first?.label).toBe('Lahug, Cebu City')
  })

  it('leaves markup as text', () => {
    const [first] = placesOf([hit('<script>alert(1)</script>', '10.3', '123.9')])
    expect(first?.label).toBe('<script>alert(1)</script>')
  })

  it('skips an item that is not an object', () => {
    expect(placesOf([null, 'Cebu', 7, [], hit('Cebu', '10.3', '123.9')])).toEqual([CEBU])
  })

  it('keeps only the label and the place', () => {
    const [first] = placesOf([hit('Cebu', '10.3', '123.9', { boundingbox: [1, 2], extratags: { a: 1 }, address: {} })])
    expect(Object.keys(first ?? {}).sort()).toEqual(['label', 'pin'])
  })

  it.each([
    ['nothing', null],
    ['text', 'busy'],
    ['an object', { error: { code: 400 } }],
    ['a number', 3],
  ])('is unavailable when the answer is %s instead of a list', (_, body) => {
    expect(readHits(body)).toBe('unavailable')
  })
})

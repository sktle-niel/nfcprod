import { describe, expect, it } from 'vitest'
import {
  googleMapsUrl,
  isInPhilippines,
  MIN_PIN_ZOOM,
  PH_BOUNDS,
  pinKey,
  readPin,
  roundCoordinate,
  roundPin,
} from './pin'

describe('roundCoordinate and roundPin', () => {
  it('keeps five decimals, about one meter', () => {
    expect(roundCoordinate(10.3280553)).toBe(10.32806)
    expect(roundCoordinate(123.9059107)).toBe(123.90591)
    expect(roundCoordinate(-0.000004) === 0).toBe(true)
    expect(roundCoordinate(10.5)).toBe(10.5)
  })

  it('rounds both numbers of a pin and leaves the original alone', () => {
    const pin = { lat: 10.3280553, lng: 123.9059107 }
    expect(roundPin(pin)).toEqual({ lat: 10.32806, lng: 123.90591 })
    expect(pin).toEqual({ lat: 10.3280553, lng: 123.9059107 })
  })

  it('does not round a rounded pin again into something else', () => {
    const once = roundPin({ lat: 7.064449999, lng: 125.608649999 })
    expect(roundPin(once)).toEqual(once)
  })
})

describe('isInPhilippines', () => {
  it('accepts the far ends of the country', () => {
    expect(isInPhilippines({ lat: 20.78, lng: 121.84 })).toBe(true) // Itbayat, Batanes, the north
    expect(isInPhilippines({ lat: 4.8, lng: 119.47 })).toBe(true) // Sibutu, Tawi-Tawi, the south
    expect(isInPhilippines({ lat: 11.05, lng: 114.28 })).toBe(true) // Pag-asa Island, Kalayaan, Palawan, the west
  })

  it('reaches Pag-asa Island, which the lists of places offer, and ends a little west of it', () => {
    // Kalayaan has one barangay, Pag-asa, and the pin is required: a box that left the island out would block its orders.
    expect(isInPhilippines({ lat: 11.0522, lng: 114.2833 })).toBe(true)
    expect(isInPhilippines({ lat: 11.05, lng: 114 })).toBe(true)
    expect(isInPhilippines({ lat: 11.05, lng: 113.9999 })).toBe(false)
  })

  it('accepts a spot in Cebu City and one in Manila', () => {
    expect(isInPhilippines({ lat: 10.328, lng: 123.906 })).toBe(true)
    expect(isInPhilippines({ lat: 14.5547, lng: 121.0244 })).toBe(true)
  })

  it('accepts the edges of the box and refuses a hair beyond each of them', () => {
    const { south, north, west, east } = PH_BOUNDS
    const middle = { lat: 12, lng: 122 }
    for (const edge of [{ lat: south }, { lat: north }, { lng: west }, { lng: east }]) {
      expect(isInPhilippines({ ...middle, ...edge })).toBe(true)
    }
    for (const outside of [{ lat: south - 0.00001 }, { lat: north + 0.00001 }, { lng: west - 0.00001 }, { lng: east + 0.00001 }]) {
      expect(isInPhilippines({ ...middle, ...outside })).toBe(false)
    }
  })

  it('refuses the null island, other countries and the poles', () => {
    expect(isInPhilippines({ lat: 0, lng: 0 })).toBe(false)
    expect(isInPhilippines({ lat: 1.35, lng: 103.82 })).toBe(false) // Singapore
    expect(isInPhilippines({ lat: 14.6, lng: -121 })).toBe(false) // sign flipped
    expect(isInPhilippines({ lat: 90, lng: 180 })).toBe(false)
  })

  it('refuses numbers that are not real ones', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(isInPhilippines({ lat: bad, lng: 122 })).toBe(false)
      expect(isInPhilippines({ lat: 12, lng: bad })).toBe(false)
    }
  })
})

describe('pinKey', () => {
  it('gives the same key for spots less than a meter apart', () => {
    expect(pinKey({ lat: 10.328001, lng: 123.906 })).toBe(pinKey({ lat: 10.3280049, lng: 123.9060049 }))
  })

  it('gives different keys for spots a meter or more apart', () => {
    expect(pinKey({ lat: 10.328, lng: 123.906 })).not.toBe(pinKey({ lat: 10.32801, lng: 123.906 }))
    expect(pinKey({ lat: 10.328, lng: 123.906 })).not.toBe(pinKey({ lat: 10.328, lng: 123.90601 }))
  })

  it('always writes five decimals, and never "-0"', () => {
    expect(pinKey({ lat: 10.5, lng: 123 })).toBe('10.50000,123.00000')
    expect(pinKey({ lat: -0.000001, lng: 0 })).toBe('0.00000,0.00000')
  })
})

describe('readPin', () => {
  it('says there is no pin when both values are blank', () => {
    expect(readPin('', '')).toBeNull()
    expect(readPin('  ', '\t')).toBeNull()
  })

  it('turns the two form values into numbers', () => {
    expect(readPin('10.32800', '123.90600')).toEqual({ lat: 10.328, lng: 123.906 })
    expect(readPin(' 10.328 ', ' 123.906 ')).toEqual({ lat: 10.328, lng: 123.906 })
  })

  it('keeps a half-empty pin as a pin with a number that is not real, so validation can name it', () => {
    const noLng = readPin('10.328', '')
    expect(noLng?.lat).toBe(10.328)
    expect(Number.isNaN(noLng?.lng)).toBe(true)
    const noLat = readPin(' ', '123.906')
    expect(Number.isNaN(noLat?.lat)).toBe(true)
    expect(noLat?.lng).toBe(123.906)
  })

  it('keeps text as a pin with numbers that are not real, and the box check refuses it', () => {
    const pin = readPin('abc', '123.906')
    expect(pin).not.toBeNull()
    expect(isInPhilippines(pin ?? { lat: 0, lng: 0 })).toBe(false)
  })

  it.each([
    ['infinity', 'Infinity'],
    ['hexadecimal', '0x10'],
    ['an exponent', '1e1'],
    ['a plus sign', '+10.5'],
    ['a decimal comma', '10,5'],
    ['a trailing point', '10.'],
    ['two points', '10.5.5'],
    ['more digits than any coordinate has', '1234.5'],
    ['non-ASCII digits', '١٠.٥'],
  ])('does not read %s as a number (Number() would), so the pin is refused', (_, text) => {
    const pin = readPin(text, '123.906')
    expect(Number.isNaN(pin?.lat)).toBe(true)
    expect(isInPhilippines(pin ?? { lat: 0, lng: 0 })).toBe(false)
  })

  it('reads a negative decimal', () => {
    expect(readPin('-10.5', '-123.25')).toEqual({ lat: -10.5, lng: -123.25 })
  })

  it('reads a pin at 0,0 as a pin (zero is a number, not blank)', () => {
    expect(readPin('0', '0')).toEqual({ lat: 0, lng: 0 })
  })
})

describe('googleMapsUrl', () => {
  it('opens the spot with its rounded numbers and nothing else', () => {
    expect(googleMapsUrl({ lat: 10.3280553, lng: 123.9059107 })).toBe('https://www.google.com/maps?q=10.32806,123.90591')
    expect(googleMapsUrl({ lat: 7.1, lng: 125 })).toBe('https://www.google.com/maps?q=7.1,125')
  })

  it('is always a Google Maps link, so it is safe to put in an href', () => {
    for (const pin of [{ lat: 4.8, lng: 119.47 }, { lat: 20.78, lng: 121.84 }, { lat: 0.00001, lng: 121 }]) {
      expect(googleMapsUrl(pin)).toMatch(/^https:\/\/www\.google\.com\/maps\?q=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    }
  })
})

describe('MIN_PIN_ZOOM', () => {
  it('asks for a zoom that shows a street, not a region', () => {
    expect(MIN_PIN_ZOOM).toBe(14)
  })
})

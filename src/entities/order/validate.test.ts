import { describe, expect, it } from 'vitest'
import { readPin, type Pin } from '@/entities/location/pin'
import { LAHUG_PIN as LAHUG } from '@/test/orders'
import type { RawOrder } from './order'
import { cleanText, normalizePhone, validateOrder, type FieldError } from './validate'

const valid: RawOrder = {
  items: [{ platform: 'google', quantity: 1 }],
  fullName: 'Juan Dela Cruz Jr.',
  phone: '0917 123 4567',
  province: 'Cebu',
  city: 'Cebu City',
  barangay: 'Lahug',
  street: '12 Salinas Drive',
  landmark: 'Blue gate beside the 7-Eleven, 2nd house',
  consent: true,
  pin: LAHUG,
  mapUnavailable: false,
}

describe('normalizePhone', () => {
  it.each([
    ['09171234567', '+639171234567'],
    ['0917 123 4567', '+639171234567'],
    ['0917-123-4567', '+639171234567'],
    ['9171234567', '+639171234567'],
    ['639171234567', '+639171234567'],
    ['+63 917 123 4567', '+639171234567'],
  ])('accepts %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each(['', '12345', '0817123456', '091712345678', 'abcdefghijk', '+1 202 555 0100'])(
    'rejects %s',
    (input) => {
      expect(normalizePhone(input)).toBeNull()
    },
  )
})

describe('cleanText', () => {
  it('trims, collapses spaces and drops control characters', () => {
    expect(cleanText('  Juan   \n  Dela\u0000Cruz ')).toBe('Juan Dela Cruz')
  })
})

describe('validateOrder', () => {
  it('accepts a complete order and returns cleaned values', () => {
    const result = validateOrder({ ...valid, fullName: '  Juan   Dela Cruz Jr. ' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.phone).toBe('+639171234567')
      expect(result.order.fullName).toBe('Juan Dela Cruz Jr.')
      expect(result.order.items).toEqual([{ platform: 'google', quantity: 1 }])
    }
  })

  it('reports every missing field', () => {
    const result = validateOrder({
      ...valid,
      items: [],
      fullName: '',
      phone: '',
      province: '',
      city: '',
      barangay: '',
      street: '',
      landmark: '',
      consent: false,
      pin: null,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['barangay', 'city', 'consent', 'fullName', 'landmark', 'phone', 'pin', 'platforms', 'province', 'street'].sort(),
      )
      expect(result.errors.phone).toBe('required')
    }
  })

  it('rejects markup and odd characters in names and addresses', () => {
    const result = validateOrder({
      ...valid,
      fullName: '<script>alert(1)</script>',
      street: '12 Main St; DROP TABLE orders',
      landmark: 'near `rm -rf` gate number two',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.fullName).toBe('invalid')
      expect(result.errors.street).toBe('invalid')
      expect(result.errors.landmark).toBe('invalid')
    }
  })

  it('rejects a landmark that is too short to find the house', () => {
    const result = validateOrder({ ...valid, landmark: 'near' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.landmark).toBe('tooShort')
  })

  it('rejects over-long input', () => {
    const result = validateOrder({ ...valid, landmark: 'a'.repeat(201) })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.landmark).toBe('tooLong')
  })

  it.each<[RawOrder['items'], FieldError]>([
    [[], 'required'],
    [[{ platform: 'tiktok', quantity: 1 }], 'invalid'],
    [
      [
        { platform: 'google', quantity: 1 },
        { platform: 'google', quantity: 2 },
      ],
      'invalid',
    ],
    [[{ platform: 'google', quantity: 0 }], 'quantity'],
    [[{ platform: 'google', quantity: 21 }], 'quantity'],
    [[{ platform: 'google', quantity: 1.5 }], 'quantity'],
    [[{ platform: 'google', quantity: Number.NaN }], 'quantity'],
  ])('checks the cards %j', (items, expected) => {
    const result = validateOrder({ ...valid, items })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.platforms).toBe(expected)
  })

  it('keeps a quantity for each chosen card', () => {
    const items = [
      { platform: 'facebook', quantity: 2 },
      { platform: 'google', quantity: 20 },
    ]
    const result = validateOrder({ ...valid, items })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.items).toEqual(items)
  })

  it('needs consent', () => {
    const result = validateOrder({ ...valid, consent: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.consent).toBe('required')
  })
})

describe('validateOrder, the delivery pin', () => {
  /** What the rest of a good order says about this pin: null when the order is accepted. */
  function errorsFor(pin: Pin | null, mapUnavailable = false) {
    const result = validateOrder({ ...valid, pin, mapUnavailable })
    return result.ok ? null : result.errors
  }

  function orderFor(pin: Pin | null, mapUnavailable = false) {
    const result = validateOrder({ ...valid, pin, mapUnavailable })
    if (!result.ok) throw new Error(`the order was refused: ${JSON.stringify(result.errors)}`)
    return result.order
  }

  it('is required', () => {
    expect(errorsFor(null)).toEqual({ pin: 'required' })
  })

  it('goes into the order', () => {
    expect(orderFor(LAHUG).pin).toEqual(LAHUG)
  })

  it('is rounded to five decimals, about one meter', () => {
    expect(orderFor({ lat: 10.3280049, lng: 123.9059951 }).pin).toEqual(LAHUG)
    expect(orderFor({ lat: 10.32801, lng: 123.90599 }).pin).toEqual({ lat: 10.32801, lng: 123.90599 })
  })

  it('sends only the two numbers, whatever else was attached to it', () => {
    const crowded = Object.assign({ lat: 10.328, lng: 123.906 }, { accuracy: 8, note: '<script>' })
    expect(orderFor(crowded).pin).toEqual(LAHUG)
  })

  it.each<[string, number, number]>([
    ['Itbayat, Batanes, the far north', 20.78, 121.84],
    ['Sibutu, Tawi-Tawi, the far south', 4.8, 119.47],
    ['Manila', 14.5995, 120.9842],
    ['Pag-asa Island, Kalayaan, Palawan, the far west', 11.05, 114.28],
    ['the south-west corner of the box', 4.5, 114],
    ['the north-east corner of the box', 21.5, 127],
  ])('accepts %s', (_, lat, lng) => {
    expect(errorsFor({ lat, lng })).toBeNull()
  })

  it.each<[string, number, number]>([
    ['0, 0 in the Atlantic', 0, 0],
    ['just south of the box', 4.4999, 120],
    ['just north of the box', 21.5001, 120],
    ['just west of the box', 12, 113.9999],
    ['just east of the box', 12, 127.0001],
    ['Tokyo', 35.68, 139.69],
    ['the numbers the wrong way round', 121.84, 20.78],
  ])('refuses %s', (_, lat, lng) => {
    expect(errorsFor({ lat, lng })).toEqual({ pin: 'invalid' })
  })

  it.each<[string, number, number]>([
    ['a latitude that is NaN', Number.NaN, 120],
    ['a longitude that is NaN', 12, Number.NaN],
    ['a latitude of Infinity', Number.POSITIVE_INFINITY, 120],
    ['a longitude of minus Infinity', 12, Number.NEGATIVE_INFINITY],
  ])('refuses a pin with %s', (_, lat, lng) => {
    expect(errorsFor({ lat, lng })).toEqual({ pin: 'invalid' })
  })

  describe('as the form reads it from the two hidden fields', () => {
    it('accepts the text the map writes', () => {
      expect(orderFor(readPin('10.32800', '123.90600')).pin).toEqual(LAHUG)
    })

    it('is missing when both are blank', () => {
      expect(errorsFor(readPin('', ''))).toEqual({ pin: 'required' })
      expect(errorsFor(readPin('  ', ''))).toEqual({ pin: 'required' })
    })

    it.each([
      ['only the latitude', '10.328', ''],
      ['only the longitude', '', '123.906'],
      ['words', 'north', 'east'],
      ['a spot in another country', '35.68', '139.69'],
      ['a number too big to be one', '1e999', '123.906'],
    ])('refuses %s', (_, lat, lng) => {
      expect(errorsFor(readPin(lat, lng))).toEqual({ pin: 'invalid' })
    })
  })

  describe('when the map could not load for the customer', () => {
    it('lets the order go without a pin, and the order has none', () => {
      expect(errorsFor(null, true)).toBeNull()
      expect('pin' in orderFor(null, true)).toBe(false)
    })

    it('still keeps a pin that was placed', () => {
      expect(orderFor(LAHUG, true).pin).toEqual(LAHUG)
    })

    it('still refuses a pin that is not a real spot in the country', () => {
      expect(errorsFor({ lat: 0, lng: 0 }, true)).toEqual({ pin: 'invalid' })
      expect(errorsFor({ lat: Number.NaN, lng: 123.906 }, true)).toEqual({ pin: 'invalid' })
    })

    it('excuses nothing else', () => {
      const result = validateOrder({ ...valid, landmark: '', pin: null, mapUnavailable: true })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(Object.keys(result.errors)).toEqual(['landmark'])
    })
  })
})

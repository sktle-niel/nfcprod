import { describe, expect, it } from 'vitest'
import type { RawOrder } from './order'
import { cleanText, normalizePhone, validateOrder } from './validate'

const valid: RawOrder = {
  bundleId: 'one',
  platforms: ['google'],
  fullName: 'Juan Dela Cruz Jr.',
  phone: '0917 123 4567',
  province: 'Cebu',
  city: 'Cebu City',
  barangay: 'Lahug',
  street: '12 Salinas Drive',
  landmark: 'Blue gate beside the 7-Eleven, 2nd house',
  consent: true,
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
      expect(result.order.platforms).toEqual(['google'])
    }
  })

  it('reports every missing field', () => {
    const result = validateOrder({
      ...valid,
      platforms: [],
      fullName: '',
      phone: '',
      province: '',
      city: '',
      barangay: '',
      street: '',
      landmark: '',
      consent: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['barangay', 'city', 'consent', 'fullName', 'landmark', 'phone', 'platforms', 'province', 'street'].sort(),
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

  it.each([
    ['one', ['facebook', 'google'], 'wrongCount'],
    ['two', ['facebook'], 'wrongCount'],
    ['three', ['facebook', 'google'], 'wrongCount'],
    ['two', ['facebook', 'facebook'], 'wrongCount'],
    ['one', ['tiktok'], 'invalid'],
    ['ten', ['google'], 'invalid'],
  ])('checks the card choice for bundle %s with %j', (bundleId, platforms, expected) => {
    const result = validateOrder({ ...valid, bundleId, platforms })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.platforms).toBe(expected)
  })

  it('accepts all three cards for the full bundle', () => {
    const result = validateOrder({ ...valid, bundleId: 'three', platforms: ['facebook', 'instagram', 'google'] })
    expect(result.ok).toBe(true)
  })

  it('needs consent', () => {
    const result = validateOrder({ ...valid, consent: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.consent).toBe('required')
  })
})

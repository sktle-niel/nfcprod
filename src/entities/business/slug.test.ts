import { describe, expect, it } from 'vitest'
import { isValidSlug } from './slug'

describe('isValidSlug', () => {
  it.each(['cafe-luna', 'abc', 'resto-123', 'a1b2c3'])('accepts %s', (slug) => {
    expect(isValidSlug(slug)).toBe(true)
  })

  it.each([
    'ab',
    'Cafe-Luna',
    '-cafe',
    'cafe-',
    'ca--fe',
    'cafe luna',
    'cafe_luna',
    '../etc/passwd',
    '<script>',
    'javascript:alert(1)',
    'a'.repeat(41),
    'admin',
    'api',
  ])('rejects %s', (slug) => {
    expect(isValidSlug(slug)).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isValidSlug(undefined)).toBe(false)
    expect(isValidSlug(42)).toBe(false)
  })
})

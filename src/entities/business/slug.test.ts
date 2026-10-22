import { describe, expect, it } from 'vitest'
import { isValidSlug, slugProblem, suggestSlug } from './slug'

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

describe('slugProblem', () => {
  it('finds nothing wrong with a valid slug', () => {
    expect(slugProblem('cafe-luna')).toBeNull()
  })

  it('calls a well-formed slug on the blocklist reserved', () => {
    expect(slugProblem('admin')).toBe('reserved')
    expect(slugProblem('dashboard')).toBe('reserved')
  })

  it.each(['ab', 'Admin', 'cafe luna', '-cafe', 'a'.repeat(41), ''])('calls %j invalid', (value) => {
    expect(slugProblem(value)).toBe('invalid')
  })

  it('calls what is not text invalid', () => {
    expect(slugProblem(42 as unknown as string)).toBe('invalid')
  })

  it('agrees with isValidSlug', () => {
    for (const value of ['cafe-luna', 'abc', 'ab', 'admin', 'Cafe', 'ca--fe', 'menu', 'resto-123', 'a'.repeat(40), 'a'.repeat(41)]) {
      expect(slugProblem(value) === null).toBe(isValidSlug(value))
    }
  })
})

describe('suggestSlug', () => {
  it.each([
    ['Café Luna', 'cafe-luna'],
    ["Kuya J's Grill & Bar", 'kuya-j-s-grill-bar'],
    ['Niña Ñora Bakeshop', 'nina-nora-bakeshop'],
    ['  --Hello__World--  ', 'hello-world'],
    ['ＣＡＦＥ ２４', 'cafe-24'],
    ['☕ Bean There ☕', 'bean-there'],
    ['Résumé  Coffee   Co.', 'resume-coffee-co'],
  ])('turns %j into %j', (name, slug) => {
    expect(suggestSlug(name)).toBe(slug)
  })

  it('cuts a long name at 40 characters without a hyphen at the end', () => {
    expect(suggestSlug(`${'a'.repeat(39)} bcd`)).toBe('a'.repeat(39))
    expect(suggestSlug('word '.repeat(20))).toHaveLength(39)
  })

  it.each(['Admin', 'MENU', 'AB', '!!!', '', '   ', '咖啡', '🍵🍵🍵'])('gives nothing usable for %j', (name) => {
    expect(suggestSlug(name)).toBe('')
  })

  it('gives nothing for what is not text', () => {
    expect(suggestSlug(null as unknown as string)).toBe('')
  })

  it('only ever suggests a valid slug', () => {
    for (const name of ['Café Luna', 'x', 'a b c d', 'Ma Mon Luk 1920', `${'Long name '.repeat(10)}`]) {
      const slug = suggestSlug(name)
      expect(slug === '' || isValidSlug(slug)).toBe(true)
    }
  })
})

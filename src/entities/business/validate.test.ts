import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import { deepFreeze } from '@/shared/lib/freeze'
import { BUSINESS_LIMITS, validateBusinessPatch, validateNewBusiness } from './validate'

const PNG = `data:image/png;base64,${btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d))}`

/** The problems of a patch, by field. */
function errorsOf(input: unknown) {
  const result = validateBusinessPatch(input)
  return result.ok ? {} : result.errors
}

describe('validateBusinessPatch', () => {
  it('keeps only the keys that are there, cleaned', () => {
    expect(validateBusinessPatch({ name: '  Cafe   Luna ' })).toEqual({ ok: true, value: { name: 'Cafe Luna' } })
  })

  it('takes every field of the Design page at once', () => {
    const patch = {
      name: 'Cafe Luna',
      tagline: 'Coffee by the sea',
      logo: PNG,
      phone: '+63 (32) 123-4567',
      address: '12 Salinas Drive, Lahug, Cebu City',
      hours: 'Mon to Sat 8am to 9pm\nSun closed',
      social: { facebook: 'https://facebook.com/cafeluna', instagram: '', tiktok: '', website: 'https://cafeluna.ph/' },
      theme: DEFAULT_THEME,
    }
    expect(validateBusinessPatch(patch)).toEqual({ ok: true, value: patch })
  })

  it('drops keys the Design page does not change', () => {
    expect(validateBusinessPatch({ slug: 'admin', published: true, id: 'b2', types: ['bar'] })).toEqual({ ok: true, value: {} })
  })

  it('skips a key whose value is undefined', () => {
    const result = validateBusinessPatch({ name: undefined, tagline: 'Hi' })
    expect(result).toEqual({ ok: true, value: { tagline: 'Hi' } })
    expect(result.ok && 'name' in result.value).toBe(false)
  })

  it('checks the name', () => {
    expect(errorsOf({ name: '' })).toEqual({ name: 'required' })
    expect(errorsOf({ name: null })).toEqual({ name: 'required' })
    expect(errorsOf({ name: 'a'.repeat(BUSINESS_LIMITS.name + 1) })).toEqual({ name: 'tooLong' })
    expect(errorsOf({ name: 7 })).toEqual({ name: 'invalid' })
  })

  it('lets the tagline and the address be empty, up to their limits', () => {
    expect(validateBusinessPatch({ tagline: '', address: null })).toEqual({ ok: true, value: { tagline: '', address: '' } })
    expect(errorsOf({ tagline: 'a'.repeat(BUSINESS_LIMITS.tagline + 1) })).toEqual({ tagline: 'tooLong' })
    expect(errorsOf({ address: 'a'.repeat(BUSINESS_LIMITS.address + 1) })).toEqual({ address: 'tooLong' })
  })

  it.each(['', '0917 123 4567', '+63 917 123 4567', '(032) 123-4567', '8-7000-00'])('takes the phone %j', (phone) => {
    expect(validateBusinessPatch({ phone })).toEqual({ ok: true, value: { phone } })
  })

  it('cleans a phone number typed with full-width digits', () => {
    expect(validateBusinessPatch({ phone: '０９１７ １２３ ４５６７' })).toEqual({ ok: true, value: { phone: '0917 123 4567' } })
  })

  it.each([
    ['12345', 'tooShort'],
    ['0917-CALL-NOW', 'invalid'],
    ['0917 123 4567 ext. 2', 'invalid'],
    ['<script>', 'invalid'],
    ['0'.repeat(21), 'tooLong'],
  ])('refuses the phone %j', (phone, error) => {
    expect(errorsOf({ phone })).toEqual({ phone: error })
  })

  it('keeps the line breaks of the opening hours, cleaned, and at most six lines', () => {
    expect(validateBusinessPatch({ hours: '  Mon   to Fri 8-5\r\n\r\nSat 9-3\u0000 ' })).toEqual({
      ok: true,
      value: { hours: 'Mon to Fri 8-5\nSat 9-3' },
    })
    const result = validateBusinessPatch({ hours: '1\n2\n3\n4\n5\n6\n7' })
    expect(result.ok && result.value.hours).toBe('1\n2\n3\n4\n5\n6 7')
  })

  it('refuses opening hours that are too long or not text', () => {
    expect(errorsOf({ hours: 'a'.repeat(BUSINESS_LIMITS.hours + 1) })).toEqual({ hours: 'tooLong' })
    expect(errorsOf({ hours: ['Mon'] })).toEqual({ hours: 'invalid' })
  })

  it('checks the social links', () => {
    expect(validateBusinessPatch({ social: { instagram: 'instagram.com/cafeluna' } })).toEqual({
      ok: true,
      value: { social: { facebook: '', instagram: 'https://instagram.com/cafeluna', tiktok: '', website: '' } },
    })
    expect(errorsOf({ social: { facebook: 'https://evil.example/facebook.com' } })).toEqual({ social: 'invalid' })
    expect(errorsOf({ social: 'https://facebook.com/cafeluna' })).toEqual({ social: 'invalid' })
  })

  it('takes a logo like a product picture', () => {
    expect(validateBusinessPatch({ logo: null })).toEqual({ ok: true, value: { logo: null } })
    expect(validateBusinessPatch({ logo: 'https://cdn.example.com/logo.webp' }).ok).toBe(true)
    expect(errorsOf({ logo: 'data:image/svg+xml;base64,PHN2Zz4=' })).toEqual({ logo: 'invalid' })
    expect(errorsOf({ logo: 'javascript:alert(1)' })).toEqual({ logo: 'invalid' })
  })

  it('checks the theme with validateTheme', () => {
    const result = validateBusinessPatch({ theme: { ...DEFAULT_THEME, primary: '#C2410C', extra: 'x' } })
    expect(result).toEqual({ ok: true, value: { theme: { ...DEFAULT_THEME, primary: '#c2410c' } } })
    expect(errorsOf({ theme: { ...DEFAULT_THEME, font: 'Papyrus' } })).toEqual({ theme: 'invalid' })
    expect(errorsOf({ theme: null })).toEqual({ theme: 'invalid' })
  })

  it('reports every problem at once', () => {
    expect(errorsOf({ name: '', phone: 'abc', hours: 5, logo: 'x', social: null, theme: {} })).toEqual({
      name: 'required',
      phone: 'invalid',
      hours: 'invalid',
      logo: 'invalid',
      social: 'invalid',
      theme: 'invalid',
    })
  })

  it.each([null, undefined, 'Cafe', 42, []])('finds nothing to change in %j', (input) => {
    expect(validateBusinessPatch(input)).toEqual({ ok: true, value: {} })
  })

  it('reads "__proto__" from JSON as a plain name and keeps it out of the patch', () => {
    const input: unknown = JSON.parse('{"__proto__": {"name": "Evil"}, "tagline": "Hi"}')
    const result = validateBusinessPatch(input)
    expect(result).toEqual({ ok: true, value: { tagline: 'Hi' } })
    expect(result.ok && Object.hasOwn(result.value, '__proto__')).toBe(false)
    expect(({} as Record<string, unknown>).name).toBeUndefined()
  })

  it('never throws and never changes its input', () => {
    const hostile = {
      get name(): string {
        throw new Error('boom')
      },
    }
    expect(validateBusinessPatch(hostile)).toEqual({ ok: false, errors: { name: 'invalid' } })
    const input = deepFreeze({ name: '  Cafe  ', hours: 'a\r\nb', social: { facebook: 'facebook.com/x' }, theme: { ...DEFAULT_THEME } })
    const before = structuredClone(input)
    validateBusinessPatch(input)
    expect(input).toEqual(before)
  })
})

describe('validateNewBusiness', () => {
  const wizard = { name: '  Cafe   Luna ', slug: 'cafe-luna', types: ['coffee', 'bakery'], samples: true }

  it('accepts what the wizard sends, with the name cleaned', () => {
    expect(validateNewBusiness(wizard)).toEqual({ ok: true, value: { ...wizard, name: 'Cafe Luna' } })
  })

  it('checks the name', () => {
    expect(validateNewBusiness({ ...wizard, name: ' ' })).toEqual({ ok: false, errors: { name: 'required' } })
    expect(validateNewBusiness({ ...wizard, name: 'a'.repeat(61) })).toEqual({ ok: false, errors: { name: 'tooLong' } })
  })

  it.each([
    ['', 'required'],
    [undefined, 'required'],
    ['ab', 'tooShort'],
    ['a'.repeat(41), 'tooLong'],
    ['Cafe-Luna', 'invalid'],
    ['cafe luna', 'invalid'],
    ['admin', 'invalid'],
    ['../etc', 'invalid'],
    [42, 'invalid'],
  ])('refuses the slug %j', (slug, error) => {
    expect(validateNewBusiness({ ...wizard, slug })).toEqual({ ok: false, errors: { slug: error } })
  })

  it.each([
    [[], 'required'],
    [undefined, 'required'],
    ['coffee', 'invalid'],
    [['pizza'], 'invalid'],
    [['coffee', '__proto__'], 'invalid'],
    [['coffee', 'coffee'], 'duplicate'],
    [['coffee', 'milkTea', 'casualDining', 'fineDining', 'bakery', 'bar', 'coffee'], 'tooMany'],
  ])('refuses the types %j', (types, error) => {
    expect(validateNewBusiness({ ...wizard, types })).toEqual({ ok: false, errors: { types: error } })
  })

  it('takes all six types at once', () => {
    const types = ['coffee', 'milkTea', 'casualDining', 'fineDining', 'bakery', 'bar']
    expect(validateNewBusiness({ ...wizard, types }).ok).toBe(true)
  })

  it('needs a yes or no for the samples', () => {
    expect(validateNewBusiness({ ...wizard, samples: false }).ok).toBe(true)
    expect(validateNewBusiness({ ...wizard, samples: undefined })).toEqual({ ok: false, errors: { samples: 'required' } })
    expect(validateNewBusiness({ ...wizard, samples: 'yes' })).toEqual({ ok: false, errors: { samples: 'invalid' } })
  })

  it.each([null, undefined, 'Cafe', 42, []])('calls every field required for %j', (input) => {
    expect(validateNewBusiness(input)).toEqual({
      ok: false,
      errors: { name: 'required', slug: 'required', types: 'required', samples: 'required' },
    })
  })

  it('never throws and never changes its input', () => {
    const { proxy, revoke } = Proxy.revocable({ ...wizard }, {})
    revoke()
    expect(validateNewBusiness(proxy).ok).toBe(false)
    const input = deepFreeze(structuredClone(wizard))
    validateNewBusiness(input)
    expect(input).toEqual(wizard)
  })
})

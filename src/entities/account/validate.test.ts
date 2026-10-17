import { describe, expect, it } from 'vitest'
import { testOwner } from '@/test/auth'
import { normalizeEmail, validateLogIn, validateSignUp } from './validate'

const valid = testOwner

describe('validateSignUp', () => {
  it('accepts a complete sign-up and cleans it', () => {
    const result = validateSignUp({ name: '  Juan   Dela Cruz ', email: ' Juan@Cafe.PH ', password: valid.password })
    expect(result).toEqual({ ok: true, input: { name: 'Juan Dela Cruz', email: 'juan@cafe.ph', password: valid.password } })
  })

  it('reports every missing field', () => {
    const result = validateSignUp({ name: '', email: '', password: '' })
    expect(result).toEqual({ ok: false, errors: { name: 'required', email: 'required', password: 'required' } }) // secret-scan:allow (error codes)
  })

  it.each([
    [{ email: 'juan@cafe' }, 'email', 'invalid'],
    [{ email: 'juan cafe@x.ph' }, 'email', 'invalid'],
    [{ email: `${'a'.repeat(250)}@x.ph` }, 'email', 'tooLong'],
    [{ password: 'short' }, 'password', 'tooShort'],
    [{ password: 'x'.repeat(73) }, 'password', 'tooLong'],
    [{ name: 'J' }, 'name', 'tooShort'],
    [{ name: '<script>' }, 'name', 'invalid'],
  ] as const)('rejects %j', (change, field, expected) => {
    const result = validateSignUp({ ...valid, ...change })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[field]).toBe(expected)
  })

  it('keeps the password exactly as typed, spaces included', () => {
    const result = validateSignUp({ ...valid, password: ' two words ' })
    expect(result.ok && result.input.password).toBe(' two words ')
  })
})

describe('validateLogIn', () => {
  it('needs an email and a password', () => {
    expect(validateLogIn({ email: '', password: '' })).toEqual({ ok: false, errors: { email: 'required', password: 'required' } }) // secret-scan:allow (error codes)
  })

  it('does not judge the length of the password, so old passwords still work', () => {
    expect(validateLogIn({ email: 'JUAN@cafe.ph', password: 'x' })).toEqual({ ok: true, input: { email: 'juan@cafe.ph', password: 'x' } })
  })
})

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Owner@Example.COM ')).toBe('owner@example.com')
  })
})

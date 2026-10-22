import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerFailure } from '@/data/ownerRepository'
import { fieldErrorsOf, fieldErrorText, ownerErrorText } from './ownerErrors'

const text = dashboardCopy.shell

describe('ownerErrorText', () => {
  it.each(['invalid', 'slugTaken', 'notFound', 'signedOut', 'tooLarge', 'unsupported', 'network'] satisfies OwnerFailure[])(
    'has its own words for the failure %s',
    (code) => {
      expect(ownerErrorText(new OwnerError(code))).toBe(text.errors[code])
    },
  )

  it('never shows the message of a failure it does not know', () => {
    expect(ownerErrorText(new Error('ECONNRESET at 10.0.0.1'))).toBe(text.errors.unknown)
    expect(ownerErrorText('boom')).toBe(text.errors.unknown)
    expect(ownerErrorText(null)).toBe(text.errors.unknown)
  })
})

describe('fieldErrorText', () => {
  it('turns each error code into words, and an unknown code into "invalid"', () => {
    expect(fieldErrorText('required')).toBe(text.fieldErrors.required)
    expect(fieldErrorText('duplicate')).toBe(text.fieldErrors.duplicate)
    expect(fieldErrorText('somethingNew')).toBe(text.fieldErrors.invalid)
    expect(fieldErrorText(undefined)).toBeUndefined()
  })
})

describe('fieldErrorsOf', () => {
  it('gives words per refused field', () => {
    const error = new OwnerError('invalid', { name: 'required', price: 'range' })
    expect(fieldErrorsOf(error)).toEqual({ name: text.fieldErrors.required, price: text.fieldErrors.range })
  })

  it('gives nothing for a failure that is not about fields', () => {
    expect(fieldErrorsOf(new OwnerError('network'))).toEqual({})
    expect(fieldErrorsOf(new Error('x'))).toEqual({})
  })
})

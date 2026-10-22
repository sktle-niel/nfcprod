import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { nameErrorText } from './nameErrors'

const words = dashboardCopy.items.category.errors.name
const limits = { name: 40, entries: 30 }

describe('nameErrorText', () => {
  it('has its own words for each reason a name is refused', () => {
    const reasons = ['required', 'tooShort', 'tooLong', 'duplicate', 'tooMany', 'invalid']
    const texts = reasons.map((code) => nameErrorText(words, code, limits))
    expect(texts.every((text) => typeof text === 'string' && text.length > 0)).toBe(true)
    // "required" and "too short" may share words; every other reason reads differently.
    expect(new Set(texts).size).toBe(reasons.length - 1)
    expect(texts).not.toContain(dashboardCopy.shell.fieldErrors.tooLong)
    expect(texts).not.toContain(dashboardCopy.shell.fieldErrors.duplicate)
    expect(texts).not.toContain(dashboardCopy.shell.fieldErrors.tooMany)
  })

  it('names the longest name for too long and the most entries for too many', () => {
    expect(nameErrorText(words, 'tooLong', limits)).toContain('40 characters')
    expect(nameErrorText(words, 'tooMany', limits)).toContain('30 categories')
  })

  it('falls back to the shared words for a reason the page has none for, and says nothing for no reason', () => {
    expect(nameErrorText({}, 'duplicate', limits)).toBe(dashboardCopy.shell.fieldErrors.duplicate)
    expect(nameErrorText({}, 'not-a-code', limits)).toBe(dashboardCopy.shell.fieldErrors.invalid)
    expect(nameErrorText(words, undefined, limits)).toBeUndefined()
  })
})

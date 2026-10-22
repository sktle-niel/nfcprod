import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS } from '@/entities/menu/menu'
import { draftOf, messagesOf } from './groupForm'
import { optionsSummary } from './groupText'

const text = dashboardCopy.addons

describe('messagesOf for the name', () => {
  it('has its own words for a name that is too long, a duplicate and too many groups', () => {
    const draft = draftOf(null)
    const words = (code: string) => messagesOf(draft, { name: code }).name
    expect(words('tooLong')).toBe(text.errors.name.tooLong.replace('{max}', String(LIMITS.groupName)))
    expect(words('duplicate')).toBe(text.errors.name.duplicate)
    expect(words('tooMany')).toBe(text.errors.name.tooMany.replace('{max}', String(LIMITS.groups)))
    expect(new Set([words('tooLong'), words('duplicate'), words('tooMany')]).size).toBe(3)
  })

  it('names the longest option name with a number, not a placeholder', () => {
    const words = messagesOf(draftOf(null), { options: 'tooLong' }).options
    expect(words).toBe(text.errors.optionsInvalid.replace('{max}', String(LIMITS.optionLabel)))
    expect(words).not.toContain('{')
  })
})

describe('optionsSummary', () => {
  it('names free options only, with no word after each', () => {
    const levels = ['0%', '25%', '50%'].map((label) => ({ label, price: 0 }))
    expect(optionsSummary(levels)).toBe('0%, 25%, 50%')
  })

  it('writes the price of each priced option', () => {
    expect(optionsSummary([{ label: 'Oat milk', price: 4500 }, { label: 'Soy milk', price: 3500 }])).toBe('Oat milk +₱45, Soy milk +₱35')
  })

  it('says which option is free when only some are', () => {
    expect(optionsSummary([{ label: 'Regular', price: 0 }, { label: 'Large', price: 2000 }])).toBe('Regular (free), Large +₱20')
  })
})

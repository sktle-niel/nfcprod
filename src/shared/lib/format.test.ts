import { describe, expect, it } from 'vitest'
import { formatPercent, initials } from './format'

describe('formatPercent', () => {
  it.each([
    [12.5, '12.5%'],
    [12, '12%'],
    [-3.04, '3%'],
    [0, '0%'],
  ])('writes %d as %s', (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })
})

describe('initials', () => {
  it.each([
    ['Maria Angelica Santos', 'MS'],
    ['juan dela cruz', 'JC'],
    ['Cher', 'C'],
    ['  ', ''],
  ])('turns %j into %j', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

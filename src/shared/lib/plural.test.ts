import { describe, expect, it } from 'vitest'
import { plural } from './plural'

const cards = { one: '1 card', many: '{n} cards' }

describe('plural', () => {
  it.each([
    [1, '1 card'],
    [0, '0 cards'],
    [12, '12 cards'],
  ])('writes %i as %j', (count, expected) => {
    expect(plural(count, cards)).toBe(expected)
  })
})

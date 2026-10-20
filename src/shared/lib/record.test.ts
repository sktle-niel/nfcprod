import { describe, expect, it } from 'vitest'
import { isRecord } from './record'

describe('isRecord', () => {
  it.each([{}, { a: 1 }, Object.create(null), new Date(0)])('accepts the object %j', (value) => {
    expect(isRecord(value)).toBe(true)
  })

  it.each([null, undefined, [], [1], 'text', 7, true, () => {}])('refuses %j', (value) => {
    expect(isRecord(value)).toBe(false)
  })
})

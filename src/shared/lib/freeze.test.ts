import { describe, expect, it } from 'vitest'
import { deepFreeze } from './freeze'

describe('deepFreeze', () => {
  it('freezes the object and everything inside it, and gives the same object back', () => {
    const data = { name: 'Coffee', categories: ['Hot'], theme: { primary: '#000000' } }
    expect(deepFreeze(data)).toBe(data)
    expect(Object.isFrozen(data)).toBe(true)
    expect(Object.isFrozen(data.categories)).toBe(true)
    expect(Object.isFrozen(data.theme)).toBe(true)
    expect(() => data.categories.push('Iced')).toThrow(TypeError)
  })

  it('gives plain values back as they are', () => {
    expect(deepFreeze('text')).toBe('text')
    expect(deepFreeze(null)).toBeNull()
    expect(deepFreeze(7)).toBe(7)
  })

  it('stops at a cycle', () => {
    const node: { self?: unknown } = {}
    node.self = node
    expect(deepFreeze(node)).toBe(node)
    expect(Object.isFrozen(node)).toBe(true)
  })
})

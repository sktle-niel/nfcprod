import { describe, expect, it } from 'vitest'
import { fill } from './fill'

describe('fill', () => {
  it('puts each value in its place, numbers too', () => {
    expect(fill('{name} moved to {n} of {count}', { name: 'Americano', n: 2, count: 5 })).toBe('Americano moved to 2 of 5')
  })

  it('fills a place that comes up twice', () => {
    expect(fill('{name}, {name}', { name: 'Kape' })).toBe('Kape, Kape')
  })

  it('leaves a place with no value as it is, and ignores a value nobody asked for', () => {
    expect(fill('{name} and {other}', { name: 'Kape', unused: 'x' })).toBe('Kape and {other}')
  })

  it.each(['Pa$$ta', 'Kape $& Cafe', 'a$`b', "a$'b", '$1 special', 'Php$99', '$<name>'])('puts %j in exactly as typed', (name) => {
    expect(fill('Saved {name}.', { name })).toBe(`Saved ${name}.`)
  })

  it('does not fill a place that a value brings in', () => {
    expect(fill('{name} is {n}', { name: '{n}', n: 3 })).toBe('{n} is 3')
    expect(fill('{a}{b}', { a: '{b}', b: 'x' })).toBe('{b}x')
  })

  it('is not fooled by a key that is also a property of every object', () => {
    expect(fill('{toString} {constructor} {__proto__}', {})).toBe('{toString} {constructor} {__proto__}')
  })
})

import { describe, expect, it } from 'vitest'
import { menuPath, menuUrl } from './links'

describe('menuPath', () => {
  it('puts the slug after /m/', () => {
    expect(menuPath('cafe-luna')).toBe('/m/cafe-luna')
  })

  it('encodes a slug that skipped its check, so it cannot change the path', () => {
    expect(menuPath('../admin')).toBe('/m/..%2Fadmin')
    expect(menuPath('a?b#c')).toBe('/m/a%3Fb%23c')
  })

  it('does not throw on a broken character', () => {
    expect(menuPath('cafe\ud800')).toBe('/m/cafe%EF%BF%BD')
  })
})

describe('menuUrl', () => {
  it('joins the origin and the path with one slash', () => {
    expect(menuUrl('cafe-luna', 'https://example.com')).toBe('https://example.com/m/cafe-luna')
    expect(menuUrl('cafe-luna', 'https://example.com/')).toBe('https://example.com/m/cafe-luna')
    expect(menuUrl('cafe-luna', 'https://example.com///')).toBe('https://example.com/m/cafe-luna')
  })
})

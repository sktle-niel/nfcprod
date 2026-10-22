import { describe, expect, it } from 'vitest'
import { isOnPublicOrigin, originFor, usablePublicOrigin } from './publicOrigin'

describe('usablePublicOrigin', () => {
  it.each([
    ['https://menu.example.com', 'https://menu.example.com'],
    ['https://menu.example.com/', 'https://menu.example.com'],
    ['https://MENU.example.com', 'https://menu.example.com'],
    ['https://example.com:8443', 'https://example.com:8443'],
  ])('keeps the origin of %s', (value, origin) => {
    expect(usablePublicOrigin(value)).toBe(origin)
  })

  it.each([
    '',
    '   ',
    'menu.example.com',
    'http://menu.example.com',
    'https://localhost',
    'https://menu.example.com/m',
    'https://menu.example.com/?a=1',
    'https://menu.example.com/#top',
    'https://user:pw@menu.example.com',
    'https://menu example.com',
    'javascript:alert(1)',
    `https://${'a'.repeat(200)}.com`,
  ])('refuses %j', (value) => {
    expect(usablePublicOrigin(value)).toBeNull()
  })
})

describe('originFor', () => {
  it('uses the configured address, and the address of the page when none is usable', () => {
    expect(originFor('https://menu.example.com', 'http://localhost:5173')).toBe('https://menu.example.com')
    expect(originFor('', 'http://localhost:5173')).toBe('http://localhost:5173')
    expect(originFor('not an address', 'http://localhost:5173')).toBe('http://localhost:5173')
  })
})

describe('isOnPublicOrigin', () => {
  it('is true with no address set, or when the page is open on it', () => {
    expect(isOnPublicOrigin('', 'http://localhost:5173')).toBe(true)
    expect(isOnPublicOrigin('https://menu.example.com', 'https://menu.example.com')).toBe(true)
  })

  it('is false when a public address is set and the page is open on another one', () => {
    expect(isOnPublicOrigin('https://menu.example.com', 'https://preview-123.vercel.app')).toBe(false)
    expect(isOnPublicOrigin('https://menu.example.com', 'https://www.example.com')).toBe(false)
  })
})

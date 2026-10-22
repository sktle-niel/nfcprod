import { describe, expect, it } from 'vitest'
import { isTrustedPicture, usableStorageOrigin } from './pictures'

const STORAGE = 'https://images.example.com'
const PNG = 'data:image/png;base64,iVBORw0KGgo='

describe('usableStorageOrigin', () => {
  it('keeps the origin of a plain https address', () => {
    expect(usableStorageOrigin('https://images.example.com')).toBe(STORAGE)
    expect(usableStorageOrigin('https://images.example.com/')).toBe(STORAGE)
  })

  it.each(['', 'images.example.com', 'http://images.example.com', 'https://images.example.com/menu', 'https://u:p@images.example.com', 'https://localhost'])(
    'refuses %j',
    (value) => {
      expect(usableStorageOrigin(value)).toBeNull()
    },
  )
})

describe('isTrustedPicture', () => {
  it('trusts an https picture on the storage origin', () => {
    expect(isTrustedPicture('https://images.example.com/menu/latte.webp', STORAGE)).toBe(true)
  })

  it.each([
    ['another host', 'https://tracker.example.com/p.gif'],
    ['a look-alike host', 'https://images.example.com.evil.example/p.gif'],
    ['a sub-domain of the storage', 'https://cdn.images.example.com/p.gif'],
    ['another port', 'https://images.example.com:8443/p.gif'],
    ['a plain http address', 'http://images.example.com/p.gif'],
    ['a script address', 'javascript:alert(1)'],
    ['not an address', 'latte.png'],
  ])('does not trust %s', (_name, address) => {
    expect(isTrustedPicture(address, STORAGE)).toBe(false)
  })

  it('trusts a data address, which asks the network for nothing', () => {
    expect(isTrustedPicture(PNG, STORAGE)).toBe(true)
    expect(isTrustedPicture(PNG, null)).toBe(true)
  })

  it('trusts no https picture while there is no storage origin', () => {
    expect(isTrustedPicture('https://images.example.com/menu/latte.webp', null)).toBe(false)
  })

  it('reads the storage origin from the setting, which the tests point at images.example.com', () => {
    expect(isTrustedPicture('https://images.example.com/a.png')).toBe(true)
    expect(isTrustedPicture('https://tracker.example.com/a.png')).toBe(false)
  })
})

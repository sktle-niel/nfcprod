import { describe, expect, it } from 'vitest'
import { isOnDomain, parseHttpsOrigin, parseHttpsUrl } from './url'

describe('parseHttpsUrl', () => {
  it('gives the parsed link for an https address', () => {
    expect(parseHttpsUrl('https://example.com/menu?x=1#top', 200)?.href).toBe('https://example.com/menu?x=1#top')
  })

  it('writes the link in its clean form', () => {
    expect(parseHttpsUrl('HTTPS://Example.COM', 200)?.href).toBe('https://example.com/')
  })

  it.each([
    'http://example.com',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com',
    'blob:https://example.com/1',
    '//example.com',
    'example.com',
    '',
    ' https://example.com',
    'https://example.com ',
    'https://exa mple.com',
    'https://example.com/\nnext',
    'https://example.com/\u0000',
    'https://example.com/\u0085',
    'https://localhost/menu',
    'https://[::1]/menu',
    'https://',
    'https://me@example.com/',
    'https://me:pw@example.com/',
  ])('refuses %j', (value) => {
    expect(parseHttpsUrl(value, 200)).toBeNull()
  })

  it('measures the length before and after the link is written out', () => {
    expect(parseHttpsUrl(`https://example.com/${'a'.repeat(200)}`, 200)).toBeNull()
    // 21 characters as typed, 26 once the ñ is encoded.
    expect(parseHttpsUrl('https://example.com/ñ', 22)).toBeNull()
    expect(parseHttpsUrl('https://example.com/ñ', 26)?.href).toBe('https://example.com/%C3%B1')
  })

  it('refuses what is not text', () => {
    expect(parseHttpsUrl(42 as unknown as string, 200)).toBeNull()
  })
})

describe('isOnDomain', () => {
  const on = (link: string, domain: string) => {
    const url = parseHttpsUrl(link, 200)
    return url !== null && isOnDomain(url, domain)
  }

  it('takes the domain and its subdomains', () => {
    expect(on('https://facebook.com/cafeluna', 'facebook.com')).toBe(true)
    expect(on('https://m.facebook.com/cafeluna', 'facebook.com')).toBe(true)
    expect(on('https://WWW.Facebook.com/cafeluna', 'facebook.com')).toBe(true)
  })

  it('refuses look-alike hosts', () => {
    expect(on('https://evilfacebook.com/cafeluna', 'facebook.com')).toBe(false)
    expect(on('https://facebook.com.evil.example/cafeluna', 'facebook.com')).toBe(false)
    expect(on('https://facebook.co/cafeluna', 'facebook.com')).toBe(false)
    expect(on('https://evil.example/facebook.com', 'facebook.com')).toBe(false)
    expect(on('https://facebook.com@evil.example/', 'facebook.com')).toBe(false)
  })
})

describe('parseHttpsOrigin', () => {
  it.each([
    ['https://menu.example.com', 'https://menu.example.com'],
    ['https://menu.example.com/', 'https://menu.example.com'],
    ['https://MENU.example.com', 'https://menu.example.com'],
    ['https://example.com:8443', 'https://example.com:8443'],
  ])('gives the origin of %s', (value, origin) => {
    expect(parseHttpsOrigin(value)).toBe(origin)
  })

  it.each([
    '',
    'menu.example.com',
    'http://menu.example.com',
    'https://localhost',
    'https://menu.example.com/m',
    'https://menu.example.com/?a=1',
    'https://menu.example.com/#top',
    'https://user:pw@menu.example.com',
    'https://menu example.com',
    `https://${'a'.repeat(200)}.com`,
  ])('refuses %j, which is more than a place', (value) => {
    expect(parseHttpsOrigin(value)).toBeNull()
  })
})

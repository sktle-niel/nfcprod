import { describe, expect, it } from 'vitest'
import { directionsHref, hasVisit } from './contact'

const PREFIX = 'https://www.google.com/maps/search/?api=1&query='
const nothing = { phone: '', address: '', hours: '', social: { facebook: '', instagram: '', tiktok: '', website: '' } }

describe('directionsHref', () => {
  it('searches Google Maps for the trimmed address', () => {
    expect(directionsHref('  12 Mabini St, Manila \n')).toBe(`${PREFIX}12%20Mabini%20St%2C%20Manila`)
  })

  it('has no link for an empty address', () => {
    expect(directionsHref('')).toBeNull()
    expect(directionsHref('  \n\t ')).toBeNull()
  })

  it('keeps hostile text inside the query', () => {
    for (const hostile of ['x&api=2#frag', 'javascript:alert(1)', '"><script>alert(1)</script>', 'a/../../evil?q=1', "a'b\r\nc"]) {
      const href = directionsHref(hostile) as string
      expect(href.startsWith(PREFIX)).toBe(true)
      const url = new URL(href)
      expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/')
      expect(url.hash).toBe('')
      expect([...url.searchParams.keys()]).toEqual(['api', 'query'])
      expect(url.searchParams.get('query')).toBe(hostile)
      expect(href.slice(PREFIX.length)).not.toMatch(/[<>"&#\s]/)
    }
  })

  it('does not crash on half a character pair, which encodeURIComponent refuses', () => {
    expect(directionsHref('Cafe \uD83D')).toBe(`${PREFIX}Cafe%20%EF%BF%BD`)
    expect(directionsHref('Cafe ☕\u{1F600}')).toBe(`${PREFIX}${encodeURIComponent('Cafe ☕\u{1F600}')}`)
  })
})

describe('hasVisit', () => {
  it('is false with nothing to show, spaces and unsafe links included', () => {
    expect(hasVisit(nothing)).toBe(false)
    expect(hasVisit({ ...nothing, phone: ' ', address: '\n', hours: '  ', social: { ...nothing.social, website: 'javascript:alert(1)' } })).toBe(false)
  })

  it('is true with any one line', () => {
    expect(hasVisit({ ...nothing, hours: 'Daily' })).toBe(true)
    expect(hasVisit({ ...nothing, address: 'Manila' })).toBe(true)
    expect(hasVisit({ ...nothing, phone: '0917' })).toBe(true)
    expect(hasVisit({ ...nothing, social: { ...nothing.social, website: 'https://luna.example' } })).toBe(true)
  })
})

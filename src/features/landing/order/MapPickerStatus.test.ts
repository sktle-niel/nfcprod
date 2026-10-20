import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { ADLAON, CEBU, CEBU_CITY, LAHUG } from '@/test/locations'
import { describePlaces, HINT, statusText, statusTone, type StatusKey } from './MapPickerStatus'

const text = copy.order.map

describe('describePlaces', () => {
  it('says found, with the names narrowest first, when province, city and barangay all matched', () => {
    expect(describePlaces({ province: CEBU, city: CEBU_CITY, barangay: LAHUG, street: '12 Salinas Drive' })).toEqual({
      key: 'found',
      place: 'Lahug, Cebu City, Cebu',
    })
  })

  it('says partial, with the levels that matched, when one is missing', () => {
    expect(describePlaces({ province: CEBU, city: CEBU_CITY })).toEqual({ key: 'partial', place: 'Cebu City, Cebu' })
    expect(describePlaces({ province: CEBU })).toEqual({ key: 'partial', place: 'Cebu' })
    expect(describePlaces({ city: CEBU_CITY, barangay: ADLAON })).toEqual({ key: 'partial', place: 'Adlaon, Cebu City' })
  })

  it('says none when no place matched, even if a street came along', () => {
    expect(describePlaces({})).toEqual({ key: 'none' })
    expect(describePlaces({ street: '12 Salinas Drive' })).toEqual({ key: 'none' })
  })
})

describe('statusText', () => {
  it('has words for every status, and none of them is left with a placeholder', () => {
    const keys: StatusKey[] = [
      'hint',
      'looking',
      'found',
      'partial',
      'none',
      'busy',
      'offline',
      'outside',
      'moved',
      'zoomIn',
      'locating',
      'denied',
      'unavailable',
      'timeout',
    ]
    for (const key of keys) {
      const words = statusText({ key, place: 'Lahug, Cebu City, Cebu' })
      expect(words.length, key).toBeGreaterThan(0)
      expect(words, key).not.toContain('{')
    }
  })

  it('puts our place names into found and partial', () => {
    expect(statusText({ key: 'found', place: 'Lahug, Cebu City, Cebu' })).toBe(text.status.found.replace('{place}', 'Lahug, Cebu City, Cebu'))
    expect(statusText({ key: 'partial', place: 'Cebu' })).toBe(text.status.partial.replace('{place}', 'Cebu'))
  })

  it('shows a name exactly as it is, even one made of replacement patterns', () => {
    expect(statusText({ key: 'found', place: "$& $1 $' $`" })).toContain("$& $1 $' $`")
  })

  it('adds the weak-location advice after the message when the pin came from a weak fix', () => {
    expect(statusText({ key: 'found', place: 'Cebu', coarse: true })).toBe(`${statusText({ key: 'found', place: 'Cebu' })} ${text.location.coarse}`)
    expect(statusText({ key: 'looking', coarse: false })).toBe(text.status.looking)
  })

  it('starts on the hint', () => {
    expect(statusText(HINT)).toBe(text.hint)
  })

  it('says the map moved, and what to do next, once the customer chose a place to look at', () => {
    expect(statusText({ key: 'moved' })).toBe(text.status.moved)
    expect(text.status.moved).toMatch(/moved/i)
    expect(text.status.moved).toContain(text.pinHere)
  })
})

describe('statusTone', () => {
  it('warns only when the pin was refused', () => {
    expect(statusTone({ key: 'outside' })).toBe('warn')
    expect(statusTone({ key: 'busy' })).toBe('info')
    expect(statusTone({ key: 'zoomIn' })).toBe('info')
    expect(statusTone(HINT)).toBe('info')
  })
})

// The words have to be true for the way the customer is using the page: with a finger, a mouse, a keyboard or a screen
// reader, and with the place fields as lists or as text boxes.
describe('the words of the panel', () => {
  const pointerOnly = /\b(tap|taps|drag|drags)\b/i

  it.each([
    ['denied', text.location.denied],
    ['unavailable', text.location.unavailable],
    ['timeout', text.location.timeout],
    ['no results', text.noResults],
    ['search failed', text.searchFailed],
    ['outside', text.status.outside],
  ])('do not tell the customer to tap or drag when the message is %s', (_name, words) => {
    expect(words).not.toMatch(pointerOnly)
    expect(words).toMatch(/pin/i)
  })

  it.each([
    ['the hint', text.hint],
    ['the name of the map', text.region],
    ['the advice for a weak location', text.location.coarse],
  ])('show a keyboard the way in too, in %s: move the map and press the button', (_name, words) => {
    expect(words).toContain(text.pinHere)
  })

  it.each([
    ['partial', text.status.partial],
    ['none', text.status.none],
    ['busy', text.status.busy],
    ['offline', text.status.offline],
  ])('do not say "lists" when the lookup is %s, because the place fields may be text boxes', (_name, words) => {
    expect(words).not.toMatch(/\blists?\b/i)
    expect(words).not.toMatch(/\bchoose\b/i)
    expect(words).toMatch(/fill in/i)
  })

  it('name everything the map service gets, and when, in the one sentence next to the map', () => {
    expect(text.privacy).toMatch(/part of the map you view/)
    expect(text.privacy).toMatch(/\byour pin\b/)
    expect(text.privacy).toMatch(/\byour searches\b/)
    expect(text.privacy).toMatch(/\bIP address\b/)
    expect(text.privacy).toContain('OpenStreetMap')
    expect(text.privacy).toContain('Nothing is sent to OpenStreetMap until you open the map.')
  })
})

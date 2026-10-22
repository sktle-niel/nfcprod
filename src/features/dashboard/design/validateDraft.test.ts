import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { sampleBusiness } from '@/test/ownerFixtures'
import { draftOf, type Draft } from './draft'
import { OwnerError } from '@/data/ownerRepository'
import { checkDraft, fieldErrorWords, knownErrors, refusedFields, type DraftCheck } from './validateDraft'

const saved = sampleBusiness()
const words = dashboardCopy.shell.fieldErrors
const mine = dashboardCopy.design.fieldErrors

function check(change: (draft: Draft) => void): DraftCheck {
  const draft = draftOf(saved)
  change(draft)
  return checkDraft(draft, saved)
}

function refusal(change: (draft: Draft) => void) {
  const result = check(change)
  if (result.ok) throw new Error('The draft was accepted')
  return result.errors
}

function patch(change: (draft: Draft) => void) {
  const result = check(change)
  if (!result.ok) throw new Error(`The draft was refused: ${JSON.stringify(result.errors)}`)
  return result.patch
}

describe('checkDraft: the patch', () => {
  it('is empty when nothing differs', () => {
    expect(patch(() => {})).toEqual({})
  })

  it('holds only the field that changed', () => {
    expect(patch((d) => void (d.tagline = 'Open late'))).toEqual({ tagline: 'Open late' })
  })

  it('holds the cleaned text, not what was typed', () => {
    expect(patch((d) => void (d.name = '  Moon    Cafe  '))).toEqual({ name: 'Moon Cafe' })
  })

  it('is empty for a change that cleaning undoes', () => {
    expect(patch((d) => void (d.name = 'Kape Kanto   '))).toEqual({})
  })

  it('keeps the line breaks of the hours and drops empty lines', () => {
    expect(patch((d) => void (d.hours = 'Daily, 8 am to 5 pm\n\n  \nClosed on Sundays'))).toEqual({
      hours: 'Daily, 8 am to 5 pm\nClosed on Sundays',
    })
  })

  it('sends all four links when one changes', () => {
    expect(patch((d) => void (d.social.tiktok = 'https://www.tiktok.com/@kapekanto'))).toEqual({
      social: {
        facebook: 'https://facebook.com/kapekanto',
        instagram: 'https://instagram.com/kapekanto',
        tiktok: 'https://www.tiktok.com/@kapekanto',
        website: '',
      },
    })
  })

  it('adds https:// to a link typed without it', () => {
    const { social } = patch((d) => void (d.social.website = 'moon.example.com'))
    expect(social?.website).toBe('https://moon.example.com/')
  })

  it('sends the whole theme when one thing in it changes', () => {
    const { theme } = patch((d) => void (d.theme.layout = 'list'))
    expect(theme).toEqual({ ...saved.theme, layout: 'list' })
  })

  it('stores colors in lowercase and counts a capitalized copy of a saved color as no change', () => {
    expect(patch((d) => void (d.theme.primary = '#8B5A2B'))).toEqual({})
    expect(patch((d) => void (d.theme.primary = '#AABBCC')).theme?.primary).toBe('#aabbcc')
  })

  it('sends a removed logo as null', () => {
    const withLogo = { ...saved, logo: 'https://example.com/logo.png' }
    const draft = { ...draftOf(withLogo), logo: null }
    const result = checkDraft(draft, withLogo)
    expect(result).toEqual({ ok: true, patch: { logo: null } })
  })

  it('does not send a logo that is already saved', () => {
    const withLogo = { ...saved, logo: 'https://example.com/logo.png' }
    expect(checkDraft(draftOf(withLogo), withLogo)).toEqual({ ok: true, patch: {} })
  })
})

describe('checkDraft: the refusals', () => {
  it('asks for a name', () => {
    expect(refusal((d) => void (d.name = '   '))).toEqual({ name: mine.name?.required })
  })

  it('refuses a name that is too long', () => {
    expect(refusal((d) => void (d.name = 'x'.repeat(61)))).toEqual({ name: words.tooLong })
  })

  it('refuses a tagline that is too long, but takes an empty one', () => {
    expect(refusal((d) => void (d.tagline = 'x'.repeat(101)))).toEqual({ tagline: words.tooLong })
    expect(patch((d) => void (d.tagline = ''))).toEqual({ tagline: '' })
  })

  it('refuses a phone with letters, and one that is too short, but takes an empty one', () => {
    expect(refusal((d) => void (d.phone = 'call me'))).toEqual({ phone: mine.phone?.invalid })
    expect(refusal((d) => void (d.phone = '12345'))).toEqual({ phone: mine.phone?.tooShort })
    expect(patch((d) => void (d.phone = ''))).toEqual({ phone: '' })
  })

  it('refuses an address and hours that are too long', () => {
    expect(refusal((d) => void (d.address = 'x'.repeat(201)))).toEqual({ address: words.tooLong })
    expect(refusal((d) => void (d.hours = `${'x'.repeat(100)}\n`.repeat(4)))).toEqual({ hours: words.tooLong })
  })

  it('refuses a logo that is not a picture address', () => {
    expect(refusal((d) => void (d.logo = 'javascript:alert(1)'))).toEqual({ logo: words.invalid })
    expect(refusal((d) => void (d.logo = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='))).toEqual({ logo: words.invalid })
  })

  it('blames the link that is wrong, and only that one', () => {
    const errors = refusal((d) => {
      d.social.facebook = 'https://example.com/not-facebook'
      d.social.tiktok = 'http://tiktok.com/@kapekanto'
    })
    expect(errors).toEqual({ facebook: mine.facebook?.invalid, tiktok: mine.tiktok?.invalid })
  })

  it('refuses a link that is too long', () => {
    expect(refusal((d) => void (d.social.website = `https://example.com/${'a'.repeat(200)}`))).toEqual({ website: words.tooLong })
  })

  it('blames the color that is not a color: invalid when it is typed wrong, required when it is empty', () => {
    expect(refusal((d) => void (d.theme.primary = '#12'))).toEqual({ primary: mine.primary?.invalid })
    expect(refusal((d) => void (d.theme.secondary = 'red'))).toEqual({ secondary: mine.secondary?.invalid })
    expect(refusal((d) => void (d.theme.background = ''))).toEqual({ background: mine.background?.required })
  })

  it('reports every problem at once', () => {
    const errors = refusal((d) => {
      d.name = ''
      d.phone = 'abc'
      d.theme.primary = 'nope'
    })
    expect(errors).toEqual({ name: mine.name?.required, phone: mine.phone?.invalid, primary: mine.primary?.invalid })
  })

  it('does not accept a draft that skips the theme font list', () => {
    const errors = refusal((d) => void ((d.theme as { font: string }).font = 'comic'))
    expect(errors).toEqual({ theme: dashboardCopy.design.look.colorsError })
  })

  it('says something specific for each of these fields, and the shared words for the rest', () => {
    expect(fieldErrorWords('website', 'invalid')).toBe(mine.website?.invalid)
    expect(fieldErrorWords('tagline', 'tooLong')).toBe(words.tooLong)
    expect(fieldErrorWords('phone', 'tooLong')).toBe(words.tooLong)
    expect(fieldErrorWords('name', 'invalid')).toBe(words.invalid)
    expect(fieldErrorWords('nothing', 'strange')).toBe(words.invalid)
  })

  it('never says only "This is not valid." for a phone, a link or a color', () => {
    for (const field of ['phone', 'facebook', 'instagram', 'tiktok', 'website', 'primary', 'secondary', 'background'])
      expect(fieldErrorWords(field, 'invalid')).not.toBe(words.invalid)
  })
})

describe('knownErrors', () => {
  it('keeps the fields of this page and drops the rest', () => {
    expect(knownErrors({ name: 'a', theme: 'b', published: 'c', slug: 'd' })).toEqual({ name: 'a', theme: 'b' })
  })
})

describe('refusedFields', () => {
  it('puts the words of this page on the fields a repository refusal names', () => {
    expect(refusedFields(new OwnerError('invalid', { phone: 'invalid', website: 'invalid', tagline: 'tooLong' }))).toEqual({
      phone: mine.phone?.invalid,
      website: mine.website?.invalid,
      tagline: words.tooLong,
    })
  })

  it('says the group words when a whole group is refused', () => {
    expect(refusedFields(new OwnerError('invalid', { social: 'invalid', theme: 'invalid' }))).toEqual({
      social: dashboardCopy.design.details.linksError,
      theme: dashboardCopy.design.look.colorsError,
    })
  })

  it('ignores fields of other pages and failures that are not about fields', () => {
    expect(refusedFields(new OwnerError('invalid', { published: 'invalid' }))).toEqual({})
    expect(refusedFields(new OwnerError('network'))).toEqual({})
    expect(refusedFields(new Error('boom'))).toEqual({})
  })
})

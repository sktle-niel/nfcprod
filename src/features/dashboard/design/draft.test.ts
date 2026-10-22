import { describe, expect, it } from 'vitest'
import { sampleBusiness } from '@/test/ownerFixtures'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import { CHOICE_KEYS, draftOf, previewOf, sameDraft, sameSocial, sameSurface, sameTheme } from './draft'

describe('draftOf', () => {
  it('copies the business fields, so changing the draft never changes the business', () => {
    const business = sampleBusiness()
    const draft = draftOf(business)
    draft.social.facebook = 'https://facebook.com/other'
    draft.theme.primary = '#000000'
    expect(business.social.facebook).toBe('https://facebook.com/kapekanto')
    expect(business.theme.primary).toBe('#8b5a2b')
    expect(draftOf(business)).toEqual(draftOf(sampleBusiness()))
  })

  it('leaves out what the page does not edit: the link, the types and the published switch', () => {
    expect(Object.keys(draftOf(sampleBusiness())).sort()).toEqual(
      ['address', 'hours', 'logo', 'name', 'phone', 'social', 'tagline', 'theme'],
    )
  })
})

describe('sameDraft', () => {
  const base = () => draftOf(sampleBusiness())

  it('is true for two drafts of the same business', () => {
    expect(sameDraft(base(), base())).toBe(true)
  })

  it.each([
    ['name', (d: ReturnType<typeof base>) => ({ ...d, name: 'Other' })],
    ['tagline', (d: ReturnType<typeof base>) => ({ ...d, tagline: '' })],
    ['logo', (d: ReturnType<typeof base>) => ({ ...d, logo: 'https://example.com/l.png' })],
    ['phone', (d: ReturnType<typeof base>) => ({ ...d, phone: '' })],
    ['address', (d: ReturnType<typeof base>) => ({ ...d, address: 'x' })],
    ['hours', (d: ReturnType<typeof base>) => ({ ...d, hours: 'x' })],
    ['a link', (d: ReturnType<typeof base>) => ({ ...d, social: { ...d.social, tiktok: 'https://tiktok.com/@x' } })],
    ['a color', (d: ReturnType<typeof base>) => ({ ...d, theme: { ...d.theme, background: '#000000' } })],
    ['the font', (d: ReturnType<typeof base>) => ({ ...d, theme: { ...d.theme, font: 'system' as const } })],
    ['the buttons', (d: ReturnType<typeof base>) => ({ ...d, theme: { ...d.theme, buttonStyle: 'pill' as const } })],
    ['the layout', (d: ReturnType<typeof base>) => ({ ...d, theme: { ...d.theme, layout: 'list' as const } })],
    ['the mode', (d: ReturnType<typeof base>) => ({ ...d, theme: { ...d.theme, mode: 'dark' as const } })],
  ])('sees a change in %s', (_name, change) => {
    expect(sameDraft(base(), change(base()))).toBe(false)
  })

  it('does not count capital letters in a color as a change', () => {
    const a = base().theme
    expect(sameTheme(a, { ...a, primary: a.primary.toUpperCase() })).toBe(true)
  })

  it.each<[string, Partial<Theme>]>([
    ['the card color', { surface: '#fffaf1' }],
    ['the style', { style: 'roast' }],
    ['the card', { card: 'tile' }],
    ['the picture shape', { photo: 'arch' }],
    ['the category titles', { title: 'ribbon' }],
    ['the header', { header: 'awning' }],
    ['the decoration', { decor: 'leaves' }],
    ['the page texture', { backdrop: 'dots' }],
    ['the best seller spotlight', { spotlight: true }],
  ])('sees a change in %s', (_name, patch) => {
    expect(sameTheme(DEFAULT_THEME, { ...DEFAULT_THEME, ...patch })).toBe(false)
  })

  it('compares every choice of the theme, not only the first ones', () => {
    expect([...CHOICE_KEYS].sort()).toEqual(
      Object.keys(DEFAULT_THEME)
        .filter((key) => !['primary', 'secondary', 'background', 'surface'].includes(key))
        .sort(),
    )
  })

  it('treats the card color as automatic or a color, in any case', () => {
    expect(sameSurface(null, null)).toBe(true)
    expect(sameSurface(null, '#ffffff')).toBe(false)
    expect(sameSurface('#FFFAF1', '#fffaf1')).toBe(true)
    expect(sameTheme({ ...DEFAULT_THEME, surface: '#ABCDEF' }, { ...DEFAULT_THEME, surface: '#abcdef' })).toBe(true)
  })

  it('compares the links one by one', () => {
    const a = base().social
    expect(sameSocial(a, { ...a })).toBe(true)
    expect(sameSocial(a, { ...a, website: 'https://example.com/' })).toBe(false)
  })
})

describe('previewOf', () => {
  const saved = sampleBusiness()

  it('shows what is typed, at once', () => {
    const draft = { ...draftOf(saved), name: 'Moon Cafe', tagline: 'Open late' }
    expect(previewOf(draft, saved)).toMatchObject({ name: 'Moon Cafe', tagline: 'Open late' })
  })

  it('keeps the saved name while the name box is empty', () => {
    expect(previewOf({ ...draftOf(saved), name: '  ' }, saved).name).toBe('Kape Kanto')
  })

  it('keeps the saved color while a color is half typed', () => {
    const draft = draftOf(saved)
    draft.theme.primary = '#12'
    draft.theme.background = '#000000'
    const { theme } = previewOf(draft, saved)
    expect(theme.primary).toBe('#8b5a2b')
    expect(theme.background).toBe('#000000')
  })

  it('falls back to the colors it is given while a color is half typed, before the saved ones', () => {
    const draft = draftOf(saved)
    draft.theme.secondary = '#f'
    const kept = { primary: '#111111', secondary: '#eef2f9', background: '#222222' }
    expect(previewOf(draft, saved, kept).theme.secondary).toBe('#eef2f9')
    expect(previewOf(draft, saved, kept).theme.primary).toBe(saved.theme.primary)
  })

  it('cleans the text as the save does: spaces only draw nothing, lines and spaces are tidied', () => {
    const draft = { ...draftOf(saved), tagline: '  ', phone: ' ', address: '   ', hours: ' \n  ' }
    expect(previewOf(draft, saved)).toMatchObject({ tagline: '', phone: '', address: '', hours: '' })
    const tidy = { ...draftOf(saved), address: ' 12   Mabini  St ', hours: ' Mon   8am \n\n Tue 9am ' }
    expect(previewOf(tidy, saved)).toMatchObject({ address: '12 Mabini St', hours: 'Mon 8am\nTue 9am' })
  })

  it('draws a link only when it is a clean link, and adds https:// to one typed without it', () => {
    const draft = draftOf(saved)
    draft.social.facebook = 'facebook.com/moon'
    draft.social.instagram = 'javascript:alert(1)'
    draft.social.tiktok = 'https://example.com/not-tiktok'
    draft.social.website = 'https://moon.example.com'
    const { social } = previewOf(draft, saved)
    expect(social.facebook).toBe('https://facebook.com/moon')
    expect(social.instagram).toBe('')
    expect(social.tiktok).toBe('')
    expect(social.website).toBe('https://moon.example.com/')
  })

  it('keeps the last whole card color while the card color is half typed, and draws automatic as automatic', () => {
    const draft = draftOf(saved)
    draft.theme.surface = '#ff'
    const kept = { primary: '#111111', secondary: '#eef2f9', background: '#222222', surface: '#f3e6d3' }
    expect(previewOf(draft, saved, kept).theme.surface).toBe('#f3e6d3')
    expect(previewOf(draft, saved).theme.surface).toBe(saved.theme.surface)
    draft.theme.surface = null
    expect(previewOf(draft, saved, kept).theme.surface).toBeNull()
  })

  it('passes the business types, so a product without a picture gets a drawing that fits', () => {
    const business = sampleBusiness({ types: ['bakery', 'coffee'] })
    expect(previewOf(draftOf(business), business).types).toEqual(['bakery', 'coffee'])
  })

  it('does not change the draft it was given', () => {
    const draft = draftOf(saved)
    draft.theme.primary = 'nope'
    previewOf(draft, saved)
    expect(draft.theme.primary).toBe('nope')
  })
})

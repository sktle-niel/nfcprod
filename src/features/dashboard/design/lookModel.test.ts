import { describe, expect, it } from 'vitest'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME, STYLE_IDS, withMode } from '@/entities/theme/theme'
import { sampleMenu } from '@/test/ownerFixtures'
import { bestForLine, styleName } from './styleWords'
import { thumbBusiness, thumbMenu } from './thumbs'
import { styleOf, switchedTheme } from './useLookActions'

describe('switchedTheme', () => {
  it.each(STYLE_IDS)('takes the %s palette of the new mode while the colors are the style own', (id) => {
    for (const [from, to] of [['light', 'dark'], ['dark', 'light']] as const) {
      const switched = switchedTheme(styleTheme(id, from), to)
      expect(switched).toEqual(styleTheme(id, to))
    }
  })

  it('keeps the choices the owner changed and only moves the colors', () => {
    const theme = { ...styleTheme('roast', 'dark'), card: 'tile' as const, font: 'system' as const }
    expect(switchedTheme(theme, 'light')).toEqual({ ...styleTheme('roast', 'light'), card: 'tile', font: 'system' })
  })

  it('sees the palette whatever the case of the colors', () => {
    const theme = { ...styleTheme('gourmet', 'dark'), primary: STYLES.gourmet.palettes.dark.primary.toUpperCase() }
    expect(switchedTheme(theme, 'light').background).toBe(STYLES.gourmet.palettes.light.background)
  })

  it('moves edited colors as before: the page and text change, the accent stays', () => {
    const theme = { ...styleTheme('fresh', 'light'), primary: '#123456' }
    expect(switchedTheme(theme, 'dark')).toEqual(withMode(theme, 'dark'))
    expect(switchedTheme(theme, 'dark').primary).toBe('#123456')
  })

  it('counts a card color the owner set as an edit', () => {
    const theme = { ...styleTheme('blush', 'light'), surface: '#ffffff' }
    expect(switchedTheme(theme, 'dark')).toEqual(withMode(theme, 'dark'))
  })

  it('reads a style that is not on the list as Classic', () => {
    expect(styleOf({ ...DEFAULT_THEME, style: 'nope' as never })).toBe('classic')
    expect(styleOf(styleTheme('noir', 'dark'))).toBe('noir')
  })
})

describe('the style words', () => {
  it('names every style and says what it is best for, in the business type words', () => {
    for (const id of STYLE_IDS) {
      expect(styleName(id)).toMatch(/^[A-Z][a-z]+$/)
      expect(bestForLine(id)).toMatch(/^Best for: /)
    }
    expect(bestForLine('classic')).toBe('Best for: any kind of menu')
    expect(bestForLine('gourmet')).toBe('Best for: Fine dining, Bar')
  })
})

describe('the thumbnail menu', () => {
  it('keeps the first two categories that show, with their first two items, and the add-on groups', () => {
    const menu = sampleMenu()
    const short = thumbMenu(menu)
    expect(short.categories.map((category) => category.name)).toEqual(['Hot', 'Iced'])
    expect(short.products.length).toBeLessThanOrEqual(4)
    for (const category of short.categories) {
      expect(short.products.filter((product) => product.categoryId === category.id).length).toBeLessThanOrEqual(2)
    }
    expect(short.groups).toBe(menu.groups)
  })

  it('leaves out hidden categories', () => {
    const menu = sampleMenu()
    const hidden = { ...menu, categories: menu.categories.map((category, index) => ({ ...category, visible: index !== 0 })) }
    expect(thumbMenu(hidden).categories.map((category) => category.name)).toEqual(['Iced'])
  })

  it('shows the samples of the business types when the menu has nothing to show yet', () => {
    const empty = { categories: [], products: [], groups: [] }
    expect(thumbMenu(empty, ['bakery']).products.length).toBeGreaterThan(0)
    expect(thumbMenu(empty, [])).toBe(empty)
  })

  it('keeps the contact details and links out of a thumbnail', () => {
    const business = thumbBusiness({ name: 'Moon', tagline: 'Late', logo: null, types: ['bar'] })
    expect(business).toMatchObject({ name: 'Moon', tagline: 'Late', phone: '', address: '', hours: '', types: ['bar'] })
    expect(Object.values(business.social).every((link) => link === '')).toBe(true)
  })
})

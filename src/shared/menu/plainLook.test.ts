import { describe, expect, it } from 'vitest'
import { STOCK_PHOTOS } from '@/entities/theme/stockPhotos'
import { styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME, isTemplateStyle, MODES, STYLE_IDS, type Theme } from '@/entities/theme/theme'
import { plainTheme } from './plainLook'

// What the old styles chose one by one: none of it is drawn while the styles are redesigned.
const PINNED = ['style', 'card', 'photo', 'title', 'header', 'decor', 'spotlight', 'buttonStyle'] as const
// What the owner still chooses: all of it is drawn.
const KEPT = ['primary', 'secondary', 'background', 'surface', 'mode', 'font', 'layout'] as const

describe('plainTheme', () => {
  const BOTH_MODES = STYLE_IDS.flatMap((id) => MODES.map((mode) => [id, mode] as const))

  it.each(BOTH_MODES.filter(([id]) => !isTemplateStyle(id)))('draws %s (%s) as Daybreak, with every other old choice pinned', (id, mode) => {
    const plain = plainTheme(styleTheme(id, mode))
    expect(plain.style).toBe('daybreak')
    for (const key of PINNED.filter((name) => name !== 'style')) expect(plain[key]).toBe(DEFAULT_THEME[key])
    expect(plain.backdrop).toBe(DEFAULT_THEME.backdrop)
  })

  it.each(BOTH_MODES.filter(([id]) => isTemplateStyle(id)))('keeps the template %s (%s), with every other old choice pinned', (id, mode) => {
    const plain = plainTheme(styleTheme(id, mode))
    expect(plain.style).toBe(id)
    for (const key of PINNED.filter((name) => name !== 'style')) expect(plain[key]).toBe(DEFAULT_THEME[key])
    expect(plain.backdrop).toBe(DEFAULT_THEME.backdrop)
  })

  it.each(STYLE_IDS.flatMap((id) => MODES.map((mode) => [id, mode] as const)))('keeps the colors, mode, font and layout of %s (%s)', (id, mode) => {
    const theme = styleTheme(id, mode)
    const plain = plainTheme(theme)
    for (const key of KEPT) expect(plain[key]).toBe(theme[key])
  })

  it('keeps the layout the owner chose', () => {
    expect(plainTheme({ ...DEFAULT_THEME, layout: 'list' }).layout).toBe('list')
  })

  it('shows a texture of an older style as the plain page', () => {
    expect(plainTheme({ ...DEFAULT_THEME, backdrop: 'terrazzo' }).backdrop).toBe('plain')
  })

  it("keeps the owner's page photo with how it is laid, under any style", () => {
    const theme: Theme = {
      ...styleTheme('noir', 'dark'),
      backdrop: 'picture',
      backdropPicture: 'data:image/png;base64,iVBORw0KGgo=',
      backdropVeil: 'strong',
      backdropFit: 'contain',
      backdropPosition: 'top',
    }
    const plain = plainTheme(theme)
    expect(plain).toMatchObject({
      backdrop: 'picture',
      backdropPicture: theme.backdropPicture,
      backdropVeil: 'strong',
      backdropFit: 'contain',
      backdropPosition: 'top',
    })
  })

  it('keeps a library photo with how it is laid, under any style', () => {
    const photo = STOCK_PHOTOS[0]
    const theme: Theme = { ...styleTheme('gourmet', 'light'), backdrop: 'stock', backdropStock: photo.id, backdropVeil: 'faint', backdropFit: 'stretch', backdropPosition: 'left' }
    expect(plainTheme(theme)).toMatchObject({ backdrop: 'stock', backdropStock: photo.id, backdropVeil: 'faint', backdropFit: 'stretch', backdropPosition: 'left' })
  })

  it('leaves a theme that is already plain as it is, draws Classic as Daybreak, and does not change the theme it is given', () => {
    const daybreak = styleTheme('daybreak', 'light')
    expect(plainTheme(daybreak)).toEqual(daybreak)
    // The default theme is the retired Classic: the only thing that changes is that it is drawn as Daybreak.
    expect(plainTheme(DEFAULT_THEME)).toEqual({ ...DEFAULT_THEME, style: 'daybreak' })
    const theme = styleTheme('catalog', 'dark')
    const before = { ...theme }
    plainTheme(theme)
    expect(theme).toEqual(before)
  })
})

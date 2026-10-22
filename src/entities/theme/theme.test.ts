import { describe, expect, it } from 'vitest'
import { PRESETS } from '@/presets'
import { deepFreeze } from '@/shared/lib/freeze'
import { isDarkColor } from './color'
import { DEFAULT_THEME, modeDefaults, MODES, withMode, type Theme } from './theme'
import { themeIssues } from './validate'

describe('modeDefaults', () => {
  it('gives the default theme colors for light', () => {
    expect(modeDefaults('light')).toEqual({ background: DEFAULT_THEME.background, secondary: DEFAULT_THEME.secondary })
  })

  it('gives dark colors that read well with the default accent', () => {
    expect(themeIssues({ ...DEFAULT_THEME, ...modeDefaults('dark'), mode: 'dark' })).toEqual([])
  })

  it('gives a fresh copy each time', () => {
    const colors = modeDefaults('light')
    colors.background = '#000000'
    expect(modeDefaults('light').background).toBe('#ffffff')
  })
})

describe('withMode', () => {
  it('takes the default colors along when the theme turns dark', () => {
    expect(withMode(DEFAULT_THEME, 'dark')).toEqual({ ...DEFAULT_THEME, ...modeDefaults('dark'), mode: 'dark' })
  })

  it('takes the default colors back when the theme turns light again', () => {
    expect(withMode(withMode(DEFAULT_THEME, 'dark'), 'light')).toEqual(DEFAULT_THEME)
  })

  it('makes any light page dark in one tap and any dark page light, whatever palette the preset gave it', () => {
    for (const { theme } of Object.values(PRESETS)) {
      const dark = withMode(theme, 'dark')
      expect(isDarkColor(dark.background)).toBe(true)
      expect(dark.mode).toBe('dark')
      const light = withMode(dark, 'light')
      expect(isDarkColor(light.background)).toBe(false)
      expect(light.mode).toBe('light')
    }
  })

  it('keeps the accent and the style choices of the owner through the swap', () => {
    for (const { theme } of Object.values(PRESETS))
      for (const mode of MODES) {
        expect(withMode(theme, mode)).toMatchObject({
          primary: theme.primary,
          font: theme.font,
          buttonStyle: theme.buttonStyle,
          layout: theme.layout,
        })
      }
  })

  it('moves a cream page to the dark defaults and a near-black page to the light defaults', () => {
    const cream: Theme = { ...DEFAULT_THEME, background: '#f8f3ec', secondary: '#2b1d14' }
    expect(withMode(cream, 'dark')).toEqual({ ...cream, ...modeDefaults('dark'), mode: 'dark' })
    const bar: Theme = { ...DEFAULT_THEME, background: '#14110f', secondary: '#f4efe9', mode: 'dark' }
    expect(withMode(bar, 'light')).toEqual({ ...bar, ...modeDefaults('light'), mode: 'light' })
  })

  it('keeps the owner colors when the page already suits the mode', () => {
    const cream: Theme = { ...DEFAULT_THEME, background: '#f8f3ec', secondary: '#2b1d14' }
    expect(withMode(cream, 'light')).toEqual(cream)
    const dark: Theme = { ...DEFAULT_THEME, background: '#14110f', secondary: '#f4efe9', mode: 'dark' }
    expect(withMode(dark, 'dark')).toEqual(dark)
    // A dark page asked to be dark only fixes the mode word.
    expect(withMode({ ...dark, mode: 'light' }, 'dark')).toEqual(dark)
  })

  it('decides from the page alone, so half of a default pair does not matter', () => {
    const tinted: Theme = { ...DEFAULT_THEME, background: '#fff8f0' }
    expect(withMode(tinted, 'dark')).toEqual({ ...tinted, ...modeDefaults('dark'), mode: 'dark' })
  })

  it('only changes the mode while the page color is not a color yet', () => {
    const half: Theme = { ...DEFAULT_THEME, background: '#12' }
    expect(withMode(half, 'dark')).toEqual({ ...half, mode: 'dark' })
  })

  it('brings back the pair it is given for the mode, when that pair suits it', () => {
    const cream: Theme = { ...DEFAULT_THEME, background: '#f8f3ec', secondary: '#2b1d14' }
    const brand = { background: '#f8f3ec', secondary: '#2b1d14' }
    const dark = withMode(cream, 'dark')
    expect(withMode(dark, 'light', brand)).toEqual({ ...cream, mode: 'light' })
    // A remembered pair of the wrong kind is ignored.
    expect(withMode(dark, 'light', { background: '#000000', secondary: '#ffffff' })).toEqual(withMode(dark, 'light'))
  })

  it('reads the page color without case', () => {
    const upper: Theme = { ...DEFAULT_THEME, background: '#FFFFFF', secondary: '#19202B' }
    expect(withMode(upper, 'dark')).toMatchObject(modeDefaults('dark'))
  })

  it('changes nothing else and leaves the old theme as it was', () => {
    const theme = deepFreeze<Theme>({ ...DEFAULT_THEME, primary: '#c2410c', font: 'system', layout: 'list' })
    const dark = withMode(theme, 'dark')
    expect(dark).not.toBe(theme)
    expect(dark).toMatchObject({ primary: '#c2410c', font: 'system', layout: 'list', buttonStyle: 'rounded' })
    expect(theme.mode).toBe('light')
  })
})

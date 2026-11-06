import { describe, expect, it } from 'vitest'
import { contrastRatio, isDarkColor, mixHex } from '@/entities/theme/color'
import { toCssVars } from '@/entities/theme/cssVars'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { MODES, type Mode } from '@/entities/theme/theme'
import { switchedTheme } from '@/features/dashboard/design/useLookActions'

/* The colors of Lightbox. The page mixes its wall, its panels and its closing panel from the theme, so those mixes are worked out here
   the way Template.module.css and Visit.module.css write them. */

const mix = (color: string, ground: string, share: number) => mixHex(ground, color, share) ?? ''

/** The grounds and the words on them, for a theme's variables. */
function pairs(vars: Record<string, string>, mode: Mode): [string, string, string][] {
  const [text, bg, accent, muted] = [vars['--menu-text'] ?? '', vars['--menu-bg'] ?? '', vars['--menu-accent'] ?? '', vars['--menu-muted'] ?? '']
  const warmed = mix(accent, bg, 0.12)
  const wall = mode === 'light' ? warmed : bg
  const panel = mode === 'light' ? bg : warmed
  const [closing, onClosing] = [panel, text]
  return [
    ['words on the wall', text, wall],
    ['a category not being read', mix(text, wall, 0.74), wall],
    ['words on a panel', text, panel],
    ['a description', muted, panel],
    ['words on the closing panel', onClosing, closing],
    ['a label on the closing panel', mix(onClosing, closing, 0.72), closing],
  ]
}

describe('the Lightbox palette', () => {
  it('has a light page in light mode and a dark page in dark mode, with the automatic card color', () => {
    expect(isDarkColor(styleTheme('lightbox', 'light').background)).toBe(false)
    expect(isDarkColor(styleTheme('lightbox', 'dark').background)).toBe(true)
    for (const mode of MODES) expect(STYLES.lightbox.palettes[mode].surface).toBeNull()
  })

  it.each(MODES)('keeps every text at 4.5:1 on the ground the page mixes for it, in %s', (mode) => {
    const vars = toCssVars(styleTheme('lightbox', mode))
    for (const [what, text, ground] of pairs(vars, mode)) expect(contrastRatio(text, ground), what).toBeGreaterThanOrEqual(4.5)
  })

  it.each(MODES)('shows the brass at 3:1 on the wall and the panels, and its lifted form on the closing panel, in %s', (mode) => {
    const vars = toCssVars(styleTheme('lightbox', mode))
    const [text, bg, accent] = [vars['--menu-text'] ?? '', vars['--menu-bg'] ?? '', vars['--menu-accent'] ?? '']
    const warmed = mix(accent, bg, 0.12)
    for (const ground of [bg, warmed]) expect(contrastRatio(accent, ground)).toBeGreaterThanOrEqual(3)
    const panel = mode === 'light' ? bg : warmed
    expect(contrastRatio(mix(accent, text, 0.55), panel)).toBeGreaterThanOrEqual(3)
  })

  it('swaps its two palettes whole while the owner has edited nothing', () => {
    const light = styleTheme('lightbox', 'light')
    const dark = switchedTheme(light, 'dark')
    expect(dark).toMatchObject({ ...STYLES.lightbox.palettes.dark, mode: 'dark' })
    expect(switchedTheme(dark, 'light')).toEqual(light)
  })

  it('keeps the owner color and readable words when an owner who edited a color goes to dark and back', () => {
    const edited = { ...styleTheme('lightbox', 'light'), primary: '#b3261e' }
    const dark = switchedTheme(edited, 'dark')
    expect(isDarkColor(dark.background)).toBe(true)
    expect(dark.primary).toBe('#b3261e')
    const back = switchedTheme(dark, 'light')
    expect(isDarkColor(back.background)).toBe(false)
    expect(isDarkColor(back.secondary)).toBe(true)
    for (const theme of [dark, back]) {
      const vars = toCssVars(theme)
      expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(4.5)
    }
  })
})

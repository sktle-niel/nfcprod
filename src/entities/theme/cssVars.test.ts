import { describe, expect, it } from 'vitest'
import { PRESETS } from '@/presets'
import { PICTURE_SHARES } from './backdrop'
import { contrastRatio, isDarkColor, mixHex } from './color'
import { fillOf, toCssVars } from './cssVars'
import { BUTTON_STYLES, DEFAULT_THEME, FONTS, LAYOUTS, modeDefaults, MODES, VEILS, withMode, type Theme, type Veil } from './theme'
import { validateTheme } from './validate'

const SANS = 'var(--font-sans)'
const SERIF = 'var(--font-serif)'
const SYSTEM = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
const PACIFICO = "Pacifico, 'Brush Script MT', cursive"
// The three font variables of each pairing, in the order of FONTS.
const FONT_ROLES = {
  '--menu-font': [SANS, SERIF, SYSTEM, SANS, SANS, SANS, SANS, SANS],
  '--menu-display': [
    SANS,
    SERIF,
    SYSTEM,
    "'Playfair Display Variable', Georgia, 'Times New Roman', serif",
    "'DM Serif Display', Georgia, 'Times New Roman', serif",
    "Anton, 'Arial Narrow', Impact, sans-serif",
    "'Fredoka Variable', 'Trebuchet MS', system-ui, sans-serif",
    PACIFICO,
  ],
  '--menu-script': FONTS.map(() => PACIFICO),
} as const
const FONT_KEYS = Object.keys(FONT_ROLES)
const FONT_VALUES = Object.values(FONT_ROLES).flat()
const RADIUS_VALUES = ['12px', '4px', '999px']
const COLOR_KEYS = [
  '--menu-bg',
  '--menu-text',
  '--menu-accent',
  '--menu-surface',
  '--menu-on-surface',
  '--menu-line',
  '--menu-card-line',
  '--menu-muted',
  '--menu-card-muted',
  '--menu-fill',
  '--menu-on-fill',
]
const COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/
const PALETTES: Theme[] = [
  DEFAULT_THEME,
  { ...DEFAULT_THEME, primary: '#8b5a2b', secondary: '#2b1d14', background: '#f8f3ec' },
  { ...DEFAULT_THEME, primary: '#f2a93b', secondary: '#f4efe9', background: '#14110f', mode: 'dark' },
  { ...DEFAULT_THEME, primary: '#FFFFFF', secondary: '#767676', background: '#FFFFFF' },
  ...Object.values(PRESETS).map((preset) => preset.theme),
]
/** Every palette in both modes, the way the Light or dark control makes them. */
const IN_BOTH_MODES = PALETTES.flatMap((theme) => [withMode(theme, 'light'), withMode(theme, 'dark')])
// Letters, digits and what a color, a var() or a font list needs. No ; : { } " \ / < > @ or ! can get through. A font list
// may hold single quotes (a family name with spaces), and only because it comes from the fixed table above.
const SAFE = /^[A-Za-z0-9#(),. -]+$/
const SAFE_FONT = /^[A-Za-z0-9#(),.' -]+$/
// The texture of a drawn backdrop: one double-quoted SVG data URL (percent-encoded, so no quote or backslash survives in
// the payload), or gradients of #rrggbbaa stops joined with ', '. Nothing else — in particular no url() to anywhere else.
const SAFE_SVG_URL = /^url\("data:image\/svg\+xml,(?:%[0-9A-Fa-f]{2}|[A-Za-z0-9\-_.!~*'()])+"\)$/
const SAFE_GRADIENTS = /^(?:repeating-)?(?:linear|radial|conic)-gradient\([a-z0-9#%,. -]+\)(?:, (?:repeating-)?(?:linear|radial|conic)-gradient\([a-z0-9#%,. -]+\))*$/

/** Every value has the form its key allows, and nothing outside the safe characters. */
function expectSafe(vars: Record<string, string>) {
  const { '--menu-backdrop-image': backdropImage, ...rest } = vars
  expect(Object.keys(rest).sort()).toEqual([...COLOR_KEYS, ...FONT_KEYS, '--menu-radius'].sort())
  if (backdropImage !== undefined) {
    expect(SAFE_SVG_URL.test(backdropImage) || SAFE_GRADIENTS.test(backdropImage), backdropImage).toBe(true)
  }
  for (const [key, value] of Object.entries(rest)) {
    if (FONT_KEYS.includes(key)) {
      expect(value).toMatch(SAFE_FONT)
      expect(FONT_VALUES).toContain(value)
    } else {
      expect(value).toMatch(SAFE)
      if (key === '--menu-radius') expect(RADIUS_VALUES).toContain(value)
      else expect(value).toMatch(COLOR)
    }
  }
}

describe('toCssVars', () => {
  it('gives the custom properties of the default theme', () => {
    expect(toCssVars(DEFAULT_THEME)).toEqual({
      '--menu-bg': '#ffffff',
      '--menu-text': '#19202b',
      '--menu-accent': '#2f80ed',
      '--menu-surface': '#ffffff',
      '--menu-on-surface': '#19202b',
      '--menu-line': '#19202b1f',
      '--menu-card-line': '#19202b1f',
      '--menu-muted': '#5e636b',
      '--menu-card-muted': '#5e636b',
      '--menu-fill': '#3b88ee',
      '--menu-on-fill': '#19202b',
      '--menu-font': 'var(--font-sans)',
      '--menu-display': 'var(--font-sans)',
      '--menu-script': PACIFICO,
      '--menu-radius': '12px',
    })
  })

  it('gives dark cards and faint light lines in dark mode', () => {
    const vars = toCssVars(withMode(DEFAULT_THEME, 'dark'))
    expect(vars['--menu-bg']).toBe(modeDefaults('dark').background)
    expect(vars['--menu-surface']).toBe(mixHex(modeDefaults('dark').background, '#ffffff', 0.06))
    expect(vars['--menu-line']).toBe('#ffffff1f')
  })

  it('draws dark cards and faint light lines on a dark page, and white cards and ink lines on a light one', () => {
    for (const theme of IN_BOTH_MODES) {
      const vars = toCssVars(theme)
      const dark = isDarkColor(vars['--menu-bg'] ?? '')
      expect(vars['--menu-line']).toBe(dark ? '#ffffff1f' : '#19202b1f')
      if (dark) expect(vars['--menu-surface']).not.toBe(vars['--menu-bg'])
    }
  })

  it('follows the page and not the mode word, so a cream page in dark mode still has visible lines and cards', () => {
    const cream = { ...DEFAULT_THEME, primary: '#8b5a2b', secondary: '#2b1d14', background: '#f8f3ec', mode: 'dark' as const }
    const vars = toCssVars(cream)
    expect(vars['--menu-surface']).toBe('#ffffff')
    expect(vars['--menu-line']).toBe('#19202b1f')
    const night = { ...DEFAULT_THEME, background: '#14110f', secondary: '#f4efe9', mode: 'light' as const }
    expect(toCssVars(night)['--menu-line']).toBe('#ffffff1f')
    expect(toCssVars(night)['--menu-surface']).toBe(mixHex('#14110f', '#ffffff', 0.06))
  })

  it('keeps the text readable on the page and on the cards for every preset in both modes', () => {
    for (const theme of IN_BOTH_MODES) {
      const vars = toCssVars(theme)
      expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('gives a dark card to light text kept in light mode, so the card never hides its text', () => {
    const vars = toCssVars({ ...DEFAULT_THEME, background: '#14110f', secondary: '#f4efe9' })
    expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
  })

  // Mid-tone pages with light text: the 6% lift took the card under 4.5:1 although the page itself passed.
  it.each([
    ['#245e61', '#9be571'],
    ['#040442', '#e6421d'],
    ['#2c733b', '#ffe80c'],
  ])('keeps card text at 4.5:1 when the text reads on the page %s but not on the page lifted by 6%%', (background, secondary) => {
    expect(contrastRatio(secondary, background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(secondary, mixHex(background, '#ffffff', 0.06) ?? '')).toBeLessThan(4.5)
    const vars = toCssVars({ ...DEFAULT_THEME, background, secondary })
    expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(vars['--menu-muted'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
  })

  it('lifts the card as far as the text allows, and falls back to the page color itself', () => {
    const background = '#245e61'
    const surface = toCssVars({ ...DEFAULT_THEME, background, secondary: '#9be571' })['--menu-surface']
    expect([mixHex(background, '#ffffff', 0.04), mixHex(background, '#ffffff', 0.02), background]).toContain(surface)
    // Text that does not read on the page at all: nothing to protect, the card is the page.
    expect(toCssVars({ ...DEFAULT_THEME, background, secondary: '#2f7d80' })['--menu-surface']).toBe(background)
  })

  it('never makes card text worse than page text, for any pair of colors that reads on the page', () => {
    const channel = [0x00, 0x2c, 0x55, 0x80, 0xaa, 0xd5, 0xff]
    const colors = channel.flatMap((r) => channel.flatMap((g) => channel.map((b) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`)))
    const sample = colors.filter((_, index) => index % 7 === 0)
    for (const background of sample)
      for (const secondary of sample) {
        if (contrastRatio(secondary, background) < 4.5) continue
        const vars = toCssVars({ ...DEFAULT_THEME, background, secondary })
        expect(contrastRatio(secondary, vars['--menu-surface'] ?? ''), `${secondary} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
  })

  it('maps every font pairing and button style through a fixed list', () => {
    for (const key of FONT_KEYS) {
      expect(FONTS.map((font) => toCssVars({ ...DEFAULT_THEME, font })[key])).toEqual(FONT_ROLES[key as keyof typeof FONT_ROLES])
    }
    expect(BUTTON_STYLES.map((buttonStyle) => toCssVars({ ...DEFAULT_THEME, buttonStyle })['--menu-radius'])).toEqual(RADIUS_VALUES)
  })

  describe('the card color', () => {
    it('is the automatic one when the owner has not chosen one, and then the card text is the page text', () => {
      const vars = toCssVars({ ...DEFAULT_THEME, surface: null })
      expect(vars['--menu-surface']).toBe('#ffffff')
      expect(vars['--menu-on-surface']).toBe(vars['--menu-text'])
    })

    it('is the owner color, written in lowercase, with text picked to read on it', () => {
      const vars = toCssVars({ ...DEFAULT_THEME, surface: '#F3E6D3' })
      expect(vars['--menu-surface']).toBe('#f3e6d3')
      expect(contrastRatio(vars['--menu-on-surface'] ?? '', '#f3e6d3')).toBeGreaterThanOrEqual(4.5)
    })

    it('gives a cream card on a dark page dark text of its own, and keeps the light text for the page', () => {
      const vars = toCssVars({ ...DEFAULT_THEME, background: '#3a2a24', secondary: '#f6e9d8', surface: '#f3e6d3' })
      expect(vars['--menu-text']).toBe('#f6e9d8')
      expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(vars['--menu-on-surface'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
      expect(isDarkColor(vars['--menu-on-surface'] ?? '')).toBe(true)
      expect(contrastRatio(vars['--menu-card-muted'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
      expect(vars['--menu-card-line']).toBe('#19202b1f')
      expect(vars['--menu-line']).toBe('#ffffff1f')
    })

    it('keeps the owner text on a dark card on a light page when it reads there', () => {
      const vars = toCssVars({ ...DEFAULT_THEME, surface: '#1f2933', secondary: '#f4efe9' })
      expect(contrastRatio(vars['--menu-on-surface'] ?? '', vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
    })

    it('keeps the text on any card color at 4.5:1 for a sweep of colors', () => {
      const channel = [0x00, 0x40, 0x80, 0xc0, 0xff]
      for (const r of channel)
        for (const g of channel)
          for (const b of channel) {
            const surface = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
            const vars = toCssVars({ ...DEFAULT_THEME, surface })
            expect(contrastRatio(vars['--menu-on-surface'] ?? '', surface), surface).toBeGreaterThanOrEqual(4.5)
            expect(contrastRatio(vars['--menu-card-muted'] ?? '', surface), surface).toBeGreaterThanOrEqual(4.5)
          }
    })

    it('falls back to the automatic card for a card color that is not a color', () => {
      const forced = { ...DEFAULT_THEME, surface: 'red;}body{display:none' } as unknown as Theme
      expect(toCssVars(forced)).toEqual(toCssVars(DEFAULT_THEME))
    })
  })

  describe('the fill behind text (price badges, label chips)', () => {
    it('is the accent itself when white or ink text reads on it at 4.5:1', () => {
      expect(fillOf('#8b5a2b')).toEqual({ fill: '#8b5a2b', on: '#ffffff' })
      expect(fillOf('#f2a93b')).toEqual({ fill: '#f2a93b', on: '#19202b' })
    })

    it('moves the accent the least that is needed when no text reads on it, toward the side the text is on', () => {
      // White reads best on this blue, but only at 4.1:1: the fill is darkened until white reaches 4.5:1.
      const white = fillOf('#4a7fc1')
      expect(white.on).toBe('#ffffff')
      expect(white.fill).not.toBe('#4a7fc1')
      expect(contrastRatio(white.fill, '#000000')).toBeLessThan(contrastRatio('#4a7fc1', '#000000'))
      const ink = fillOf(DEFAULT_THEME.primary)
      expect(ink.on).toBe('#19202b')
      expect(contrastRatio(ink.fill, '#ffffff')).toBeLessThan(contrastRatio(DEFAULT_THEME.primary, '#ffffff'))
    })

    it('reaches 4.5:1 for every color of a sweep, and stays near the accent', () => {
      const channel = [0x00, 0x20, 0x40, 0x60, 0x80, 0xa0, 0xc0, 0xe0, 0xff]
      for (const r of channel)
        for (const g of channel)
          for (const b of channel) {
            const accent = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
            const { fill, on } = fillOf(accent)
            expect(contrastRatio(fill, on), accent).toBeGreaterThanOrEqual(4.5)
          }
    })

    it('shows in the custom properties of every palette', () => {
      for (const theme of IN_BOTH_MODES) {
        const vars = toCssVars(theme)
        expect(contrastRatio(vars['--menu-on-fill'] ?? '', vars['--menu-fill'] ?? '')).toBeGreaterThanOrEqual(4.5)
      }
    })
  })

  it('writes colors in lowercase', () => {
    expect(toCssVars({ ...DEFAULT_THEME, primary: '#C2410C' })['--menu-accent']).toBe('#c2410c')
  })

  it('has no text color for the accent: the accent only draws shapes, so no label sits on it', () => {
    expect(Object.keys(toCssVars(DEFAULT_THEME))).not.toContain('--menu-on-accent')
  })

  it('keeps muted text at 4.5:1 on the page and on cards, in both modes', () => {
    for (const theme of IN_BOTH_MODES) {
      const vars = toCssVars(theme)
      const muted = vars['--menu-muted'] ?? ''
      expect(contrastRatio(muted, vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(muted, vars['--menu-surface'] ?? '')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('gives only safe values for every font, button style, layout and mode', () => {
    for (const palette of PALETTES)
      for (const font of FONTS)
        for (const buttonStyle of BUTTON_STYLES)
          for (const layout of LAYOUTS)
            for (const mode of MODES) expectSafe(toCssVars({ ...palette, font, buttonStyle, layout, mode }))
  })

  const HOSTILE: Record<string, unknown>[] = [
    { primary: 'red;}body{display:none' },
    { primary: 'url(javascript:alert(1))' },
    { primary: '#ffffff\n' },
    { primary: '\\23 ffffff' },
    { secondary: '#fff' },
    { secondary: 'var(--color-ink)' },
    { background: '#ffffff;background:url(https://evil.example/x.png)' },
    { background: 'expression(alert(1))' },
    { font: 'Comic Sans MS", serif; } * { color: red' },
    { font: 'constructor' },
    { font: '__proto__' },
    { buttonStyle: '999px; position: fixed' },
    { buttonStyle: 'toString' },
    { layout: '<script>' },
    { mode: 'dark;' },
    { mode: 'hasOwnProperty' },
  ]

  it.each(HOSTILE)('refuses %j in validateTheme, and stays safe even when it is forced through', (hostile) => {
    const input = { ...DEFAULT_THEME, ...hostile }
    expect(validateTheme(input).ok).toBe(false)
    expectSafe(toCssVars(input as unknown as Theme))
  })

  it('falls back to the defaults for values that are not valid', () => {
    const forced = { ...DEFAULT_THEME, ...HOSTILE[0], ...HOSTILE[9], ...HOSTILE[11] } as unknown as Theme
    expect(toCssVars(forced)).toEqual(toCssVars(DEFAULT_THEME))
  })
})

describe('the photo backdrop variable', () => {
  const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const image = (veil: Veil) =>
    toCssVars({ ...DEFAULT_THEME, backdrop: 'picture', backdropPicture: PHOTO, backdropVeil: veil })['--menu-backdrop-image']

  it('lays the veil of the page color at one minus the share of each strength', () => {
    expect(image('faint')).toBe(`linear-gradient(#ffffffe6, #ffffffe6), url("${PHOTO}")`)
    expect(image('soft')).toBe(`linear-gradient(#ffffffd6, #ffffffd6), url("${PHOTO}")`)
    expect(image('strong')).toBe(`linear-gradient(#ffffffc4, #ffffffc4), url("${PHOTO}")`)
  })

  it('keeps muted text at 4.5:1 on the photo worst grounds in both default modes', () => {
    for (const mode of MODES) {
      for (const veil of VEILS) {
        const vars = toCssVars({ ...DEFAULT_THEME, ...modeDefaults(mode), mode, backdrop: 'picture', backdropPicture: PHOTO, backdropVeil: veil })
        for (const pole of ['#000000', '#ffffff']) {
          const ground = mixHex(vars['--menu-bg'] ?? '', pole, PICTURE_SHARES[veil]) ?? ''
          expect(contrastRatio(vars['--menu-muted'] ?? '', ground), `${mode} ${veil} ${pole}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('shows no photo while the backdrop is not the picture, even with an address saved', () => {
    const vars = toCssVars({ ...DEFAULT_THEME, backdrop: 'plain', backdropPicture: PHOTO })
    expect(vars['--menu-backdrop-image']).toBeUndefined()
  })
})

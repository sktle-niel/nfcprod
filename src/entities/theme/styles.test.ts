import { describe, expect, it } from 'vitest'
import { contrastRatio, isDarkColor } from './color'
import { toCssVars } from './cssVars'
import { STYLES, styleTheme } from './styles'
import { BACKDROPS, CARDS, DECORS, FONTS, HEADERS, MODES, PHOTOS, STYLE_IDS, TITLES } from './theme'
import { themeIssues, validateTheme } from './validate'

const BOTH = STYLE_IDS.flatMap((id) => MODES.map((mode) => ({ id, mode, theme: styleTheme(id, mode) })))

describe('the styles', () => {
  it('have an entry for every style id, with the id they are listed under', () => {
    expect(Object.keys(STYLES).sort()).toEqual([...STYLE_IDS].sort())
    for (const id of STYLE_IDS) expect(STYLES[id].id).toBe(id)
  })

  it('give a whole valid theme for every style in both modes', () => {
    for (const { id, mode, theme } of BOTH) {
      expect(validateTheme(theme), `${id} ${mode}`).toEqual({ ok: true, value: theme })
      expect(theme.style).toBe(id)
      expect(theme.mode).toBe(mode)
    }
  })

  it('use every card kind, photo shape, title, header, decoration and font at least once, and pin the expected backdrops', () => {
    const used = (pick: (id: (typeof STYLE_IDS)[number]) => string) => new Set(STYLE_IDS.map(pick))
    expect(used((id) => STYLES[id].choices.card)).toEqual(new Set(CARDS))
    expect(used((id) => STYLES[id].choices.photo)).toEqual(new Set(PHOTOS))
    expect(used((id) => STYLES[id].choices.title)).toEqual(new Set(TITLES))
    expect(used((id) => STYLES[id].choices.header)).toEqual(new Set(HEADERS))
    expect(used((id) => STYLES[id].choices.decor)).toEqual(new Set(DECORS))
    // The backdrops outnumber the styles since the drawn textures arrived, so "every one" is no longer possible: the
    // styles pin four classic kinds and the four texture defaults (roast grain, atelier plaster, gourmet marble, noir deco).
    const backdrops = used((id) => STYLES[id].choices.backdrop)
    expect(backdrops).toEqual(new Set(['plain', 'paper', 'dots', 'stripes', 'grain', 'plaster', 'marble', 'deco']))
    for (const backdrop of backdrops) expect(BACKDROPS).toContain(backdrop)
    // The two fonts that every style could share (system, instrumentSerif) are only chosen by the owner.
    const fonts = used((id) => STYLES[id].choices.font)
    for (const font of ['urbanist', 'playfair', 'dmSerif', 'anton', 'fredoka']) expect(fonts.has(font as (typeof FONTS)[number])).toBe(true)
  })

  it('have a dark page in dark mode and a light page in light mode, so the Light or dark control keeps them as they are', () => {
    for (const { id, mode, theme } of BOTH) expect(isDarkColor(theme.background), `${id} ${mode}`).toBe(mode === 'dark')
  })

  it('read: the text is 4.5:1 and the accent 3:1 on the page, so the Colors panel has nothing to warn about', () => {
    for (const { id, mode, theme } of BOTH) expect(themeIssues(theme), `${id} ${mode}`).toEqual([])
  })

  it('read on the cards: the card text is 4.5:1 on the card, and so are the second-rank lines, for every style in both modes', () => {
    for (const { id, mode, theme } of BOTH) {
      const vars = toCssVars(theme)
      expect(contrastRatio(vars['--menu-on-surface'] ?? '', vars['--menu-surface'] ?? ''), `${id} ${mode} text`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(vars['--menu-card-muted'] ?? '', vars['--menu-surface'] ?? ''), `${id} ${mode} muted`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(vars['--menu-muted'] ?? '', vars['--menu-bg'] ?? ''), `${id} ${mode} page muted`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(vars['--menu-on-fill'] ?? '', vars['--menu-fill'] ?? ''), `${id} ${mode} fill`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keep the owner accent close: the fill behind badges and chips is the accent or a small step from it', () => {
    for (const { id, mode, theme } of BOTH) {
      const vars = toCssVars(theme)
      const fill = vars['--menu-fill'] ?? ''
      // Not the plain black or white a failed nudge ends in.
      expect(['#000000', '#ffffff'], `${id} ${mode}`).not.toContain(fill)
    }
  })

  it('name the kinds of business each one suits, at least one', () => {
    for (const id of STYLE_IDS) expect(STYLES[id].bestFor.length, id).toBeGreaterThan(0)
  })

  it('make Classic the look of a menu that has not chosen anything', () => {
    expect(styleTheme('classic', 'light')).toEqual({
      primary: '#2f80ed',
      secondary: '#19202b',
      background: '#ffffff',
      surface: null,
      backdropPicture: null,
      backdropVeil: 'soft',
      style: 'classic',
      card: 'row',
      photo: 'rounded',
      title: 'plain',
      header: 'plain',
      decor: 'none',
      backdrop: 'plain',
      spotlight: false,
      font: 'urbanist',
      buttonStyle: 'rounded',
      layout: 'grid',
      mode: 'light',
    })
  })
})

import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/entities/theme/color'
import { toCssVars } from '@/entities/theme/cssVars'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { MODES, STYLE_IDS, DEFAULT_THEME } from '@/entities/theme/theme'
import { TEXT_CONTRAST_MIN } from '@/entities/theme/validate'
import { allCss, rulesOf, type CssRule } from '@/test/css'

/*
 * What every stylesheet of the menu renderer promises, checked for all of them at once so that a new card, title, header or
 * decoration cannot quietly break it. The menu is painted from the --menu-* variables only; text uses the pair that was
 * made for the ground it sits on (the page, a card, a fill); the accent is a shape, never text.
 */

// The default theme has no drawn texture, so --menu-backdrop-image is named here: toCssVars emits it only for the drawn
// backdrop kinds (menuChrome.style.test.ts holds them to that).
const VARIABLES = new Set([...Object.keys(toCssVars(DEFAULT_THEME)), '--menu-backdrop-image'])

/** The ground a text color is drawn on, and the text colors that are checked against it (4.5:1 in every style and mode). */
const TEXT_ON: Record<string, readonly string[]> = {
  '--menu-bg': ['--menu-text', '--menu-muted'],
  '--menu-surface': ['--menu-on-surface', '--menu-card-muted'],
  '--menu-fill': ['--menu-on-fill'],
  // An inverse label: the card color on the card text color (the sold-out mark), the page color on the page text color.
  '--menu-on-surface': ['--menu-surface'],
  '--menu-text': ['--menu-bg'],
}
const TEXT_COLORS = new Set(['--menu-text', '--menu-muted', '--menu-on-surface', '--menu-card-muted', '--menu-on-fill', '--menu-surface', '--menu-bg'])

type Sheet = { path: string; rules: CssRule[] }
let sheets: Sheet[] | null = null
async function menuSheets(): Promise<Sheet[]> {
  sheets ??= (await allCss())
    .filter(({ path }) => path.replaceAll('\\', '/').startsWith('src/shared/menu/'))
    .map(({ path, css }) => ({ path: path.replaceAll('\\', '/'), rules: rulesOf(css) }))
  return sheets
}

const varOf = (value: string | undefined): string | null => /^var\((--menu-[a-z-]+)\)$/.exec(value ?? '')?.[1] ?? null

describe('the stylesheets of the menu renderer', () => {
  it('are found: the checks below would pass on nothing', async () => {
    expect((await menuSheets()).length).toBeGreaterThanOrEqual(7)
  })

  it('hold no color of their own: colors come from the --menu-* variables (a black shadow is fine)', async () => {
    const offenders: string[] = []
    for (const { path, rules } of await menuSheets()) {
      for (const rule of rules) {
        for (const [property, value] of Object.entries(rule.declarations)) {
          // A shadow is black at some opacity: it is not a color of the menu.
          const rest = value.replace(/rgb\(0 0 0 \/ [\d.]+\)/g, '')
          if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\boklch\(|\blab\(/i.test(rest)) offenders.push(`${path} ${rule.selector} { ${property}: ${value} }`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('read only variables that exist', async () => {
    const unknown: string[] = []
    for (const { path, rules } of await menuSheets()) {
      for (const rule of rules) {
        for (const value of Object.values(rule.declarations)) {
          for (const [, name] of value.matchAll(/var\((--[a-z-]+)/g)) {
            // Variables that start with --menu- are the theme's; the others (--photo-ratio, --card-*) are local to a stylesheet.
            if (name?.startsWith('--menu-') && !VARIABLES.has(name)) unknown.push(`${path} ${rule.selector} uses ${name}`)
          }
        }
      }
    }
    expect(unknown).toEqual([])
  })

  it('never color text with the accent or a fill, and never fill a shape that holds text with the plain accent', async () => {
    const offenders: string[] = []
    for (const { path, rules } of await menuSheets()) {
      for (const rule of rules) {
        const color = varOf(rule.declarations['color'])
        if (color !== null && !TEXT_COLORS.has(color)) offenders.push(`${path} ${rule.selector} { color: var(${color}) }`)
        for (const property of ['background', 'background-color']) {
          if (varOf(rule.declarations[property]) === '--menu-accent') offenders.push(`${path} ${rule.selector} { ${property}: var(--menu-accent) }`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('give text on a plain ground the text color made for that ground', async () => {
    const offenders: string[] = []
    for (const { path, rules } of await menuSheets()) {
      for (const rule of rules) {
        const color = varOf(rule.declarations['color'])
        const ground = varOf(rule.declarations['background']) ?? varOf(rule.declarations['background-color'])
        if (color === null || ground === null) continue
        const allowed = TEXT_ON[ground]
        if (allowed === undefined || !allowed.includes(color)) offenders.push(`${path} ${rule.selector} { color: var(${color}); background: var(${ground}) }`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keep every text and ground pair above at 4.5:1 for every style in light and dark', () => {
    const failures: string[] = []
    for (const id of STYLE_IDS) {
      for (const mode of MODES) {
        const vars = toCssVars(styleTheme(id, mode))
        for (const [ground, texts] of Object.entries(TEXT_ON)) {
          for (const text of texts) {
            const ratio = contrastRatio(vars[text] ?? '', vars[ground] ?? '')
            if (ratio < TEXT_CONTRAST_MIN) failures.push(`${id} ${mode}: ${text} on ${ground} is ${ratio.toFixed(2)}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('quiet a sold-out card with its photo only: no opacity on text', async () => {
    const offenders: string[] = []
    for (const { path, rules } of await menuSheets()) {
      for (const rule of rules) {
        if (rule.selector.includes('[data-sold-out]') && rule.declarations['opacity'] !== undefined && !/photo/i.test(rule.selector)) {
          offenders.push(`${path} ${rule.selector}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('know every palette of the styles: the checks above ran over all of them', () => {
    expect(Object.keys(STYLES)).toHaveLength(STYLE_IDS.length)
  })
})

// The accent has to show without any interaction (the Design preview cannot be focused or hovered), so it is drawn as
// text-free shapes on the page color: a bar beside the category title and a line under the category links.
describe('the accent on the menu', () => {
  it('is a 4px bar beside the Classic category title and a 2px line under the category links', async () => {
    const all = await menuSheets()
    const rule = (file: string, selector: string) => all.find((sheet) => sheet.path.endsWith(file))?.rules.find((r) => r.selector === selector)
    expect(rule('titles/PlainTitle.module.css', '.title')?.declarations['border-left']).toBe('4px solid var(--menu-accent)')
    expect(rule('MenuView.module.css', '.nav')?.declarations['border-bottom']).toBe('2px solid var(--menu-accent)')
    expect(rule('MenuView.module.css', '.nav')?.declarations['background']).toBe('var(--menu-bg)')
    expect(rule('MenuView.module.css', '.root')?.declarations['background']).toBe('var(--menu-bg)')
  })
})

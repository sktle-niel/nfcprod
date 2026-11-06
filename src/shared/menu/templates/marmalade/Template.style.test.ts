import { describe, expect, it } from 'vitest'
import { contrastRatio, mixHex } from '@/entities/theme/color'
import { toCssVars } from '@/entities/theme/cssVars'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { MODES } from '@/entities/theme/theme'
import { allCss, rulesOf, type CssRule } from '@/test/css'

/*
 * What the stylesheets of the Marmalade page promise beyond what menuStyleRules.test.ts checks for every stylesheet of the menu.
 */

const FOLDER = 'src/shared/menu/templates/marmalade/'

type Sheet = { file: string; rules: CssRule[] }
let sheets: Sheet[] | null = null
async function mine(): Promise<Sheet[]> {
  sheets ??= (await allCss())
    .map(({ path, css }) => ({ file: path.replaceAll('\\', '/'), rules: rulesOf(css) }))
    .filter(({ file }) => file.startsWith(FOLDER))
    .map(({ file, rules }) => ({ file: file.slice(FOLDER.length), rules }))
  return sheets
}
const rule = async (file: string, selector: string) => (await mine()).find((sheet) => sheet.file === file)?.rules.find((candidate) => candidate.selector === selector)

describe('the stylesheets of the Marmalade page', () => {
  it('are found: the checks below would pass on nothing', async () => {
    expect((await mine()).map(({ file }) => file).sort()).toEqual(['Board.module.css', 'Frame.module.css', 'Masthead.module.css', 'Row.module.css', 'SiteNav.module.css', 'SwelledRule.module.css', 'Tabs.module.css', 'Template.module.css', 'Visit.module.css'])
  })

  it('keep the tabs at the top of the screen, on the color of the wall', async () => {
    const rail = await rule('Tabs.module.css', '.rail')
    expect(rail?.declarations['position']).toBe('sticky')
    expect(rail?.declarations['top']).toBe('0')
    expect(rail?.declarations['background']).toBe('var(--menu-bg)')
  })

  it('give the tabs and the top links a 44px target and a focus ring', async () => {
    expect(Number.parseInt((await rule('Tabs.module.css', '.tab'))?.declarations['min-height'] ?? '', 10)).toBeGreaterThanOrEqual(44)
    expect((await rule('SiteNav.module.css', '.link'))?.declarations['min-height']).toBe('44px')
    expect((await rule('Visit.module.css', '.link'))?.declarations['min-height']).toBe('44px')
    expect((await rule('Tabs.module.css', '.tab:focus-visible'))?.declarations['outline']).toBe('2px solid var(--menu-text)')
    expect((await rule('SiteNav.module.css', '.link:focus-visible'))?.declarations['outline']).toBe('2px solid var(--tpl-paint)')
  })

  it('move the mark of the tabs with transforms alone', async () => {
    const mark = await rule('Tabs.module.css', '.list::after')
    expect(mark?.declarations['transform']).toContain('translateX')
    expect(mark?.declarations['left']).toBe('0')
  })

  it('underline every link of the top rail and of the Visit board', async () => {
    expect((await rule('SiteNav.module.css', '.link'))?.declarations['text-decoration']).toBe('underline')
    expect((await rule('Visit.module.css', '.link'))?.declarations['text-decoration']).toBe('underline')
  })

  it('give the add-ons control a 44px target and a focus ring', async () => {
    expect((await rule('Row.module.css', '.more'))?.declarations['min-height']).toBe('44px')
    expect((await rule('Row.module.css', '.more:focus-visible'))?.declarations['outline']).toBe('2px solid var(--menu-text)')
  })

  it('open the add-ons through the grid row, out of reach while closed', async () => {
    expect((await rule('Row.module.css', '.panel'))?.declarations['grid-template-rows']).toBe('0fr')
    expect((await rule('Row.module.css', '.panel'))?.declarations['visibility']).toBe('hidden')
    expect((await rule('Row.module.css', '.panel[data-open]'))?.declarations['grid-template-rows']).toBe('1fr')
    expect((await rule('Row.module.css', '.panelBody'))?.declarations['overflow']).toBe('hidden')
  })

  it('clip only the layers behind a board, never the board itself: a clip there would cut its focus rings', async () => {
    expect((await rule('Frame.module.css', '.ground'))?.declarations['clip-path']).toBeUndefined()
  })

  it('keep the drop shade on the name of the shop alone', async () => {
    const shaded = (await mine()).flatMap(({ file, rules }) => rules.filter(({ declarations }) => declarations['text-shadow'] !== undefined).map(({ selector }) => `${file} ${selector}`))
    expect(shaded).toEqual(['Masthead.module.css .name'])
  })

  it('never cut text short: no line clamps and no ellipsis', async () => {
    for (const { file, rules } of await mine()) {
      for (const { selector, declarations } of rules) {
        expect(declarations['-webkit-line-clamp'], `${file} ${selector}`).toBeUndefined()
        expect(declarations['text-overflow'], `${file} ${selector}`).toBeUndefined()
      }
    }
  })

  it('use the tabular numerals on prices, and keep them on one line', async () => {
    const price = await rule('Row.module.css', '.price')
    expect(price?.declarations['font-variant-numeric']).toContain('tabular-nums')
    expect(price?.declarations['white-space']).toBe('nowrap')
  })

  it('move only inside a motion check, and name what moves', async () => {
    for (const { path, css } of await allCss()) {
      if (!path.replaceAll('\\', '/').startsWith(FOLDER)) continue
      expect(css, path).not.toMatch(/transition: all/)
      if (/transition:|animation:/.test(css)) expect(css, path).toContain('prefers-reduced-motion: no-preference')
    }
  })
})

describe('the palette of the Marmalade page', () => {
  it('has a calm cream wall by day and a deep one at night, with ink that reads on it', () => {
    const light = toCssVars(styleTheme('marmalade', 'light'))
    const dark = toCssVars(styleTheme('marmalade', 'dark'))
    expect(light['--menu-bg']).toBe('#f8f0e2')
    expect(dark['--menu-bg']).toBe('#1b0f09')
    for (const vars of [light, dark]) {
      expect(contrastRatio(vars['--menu-text'] ?? '', vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(vars['--menu-muted'] ?? '', vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(MODES)('keeps the gilt and the paint of the boards readable on their ground in %s', (mode) => {
    const vars = toCssVars(styleTheme('marmalade', mode))
    const [accent, on, ground] = [vars['--menu-accent'] ?? '', vars['--menu-on-surface'] ?? '', vars['--menu-surface'] ?? '']
    // The same mixes as Frame.module.css, in plain RGB: close enough for a floor, and the browser's own values were read off the page.
    expect(contrastRatio(mixHex(accent, on, 0.22) ?? '', ground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(mixHex(on, accent, 0.16) ?? '', ground)).toBeGreaterThanOrEqual(4.5)
  })

  it('is the default look of casual dining and milk tea, in the sign lettering, as a list', () => {
    expect(STYLES.marmalade.bestFor).toEqual(['casualDining', 'milkTea'])
    expect(STYLES.marmalade.choices.font).toBe('dmSerif')
    expect(STYLES.marmalade.choices.layout).toBe('list')
  })
})

import { describe, expect, it } from 'vitest'
import { allCss, readCss, rulesOf, type CssRule } from '@/test/css'

/* What the stylesheets of Daybreak promise. Vitest does not load CSS, so the rules are read from disk; the shared rules (no color of
   its own, text on its own ground, sold-out quieting) are checked for every stylesheet of the menu by menuStyleRules.test.ts. */

const DIR = 'src/shared/menu/templates/daybreak'
const FILES = ['CategoryStrip', 'Masthead', 'ProductRow', 'SearchField', 'SiteNav', 'Template', 'Visit']
const WIDE = '@container (min-width: 640px)'

async function rules(name: string): Promise<CssRule[]> {
  return rulesOf(await readCss(`${DIR}/${name}.module.css`))
}
const rule = (all: CssRule[], selector: string, within: string[] = []) => all.find((candidate) => candidate.selector === selector && candidate.within.join('|') === within.join('|'))
const declared = async (file: string, selector: string, property: string, within: string[] = []) => rule(await rules(file), selector, within)?.declarations[property]

describe('the Daybreak stylesheets', () => {
  it('are the ones this test goes through: a new stylesheet has to join the list', async () => {
    const found = (await allCss())
      .map(({ path }) => path.replaceAll('\\', '/'))
      .filter((path) => path.startsWith(`${DIR}/`))
      .map((path) => path.slice(DIR.length + 1).replace('.module.css', ''))
    expect(found.sort()).toEqual(FILES)
  })

  it('draw the search text at 16px, so a phone does not zoom the page when the field is tapped', async () => {
    expect(await declared('SearchField', '.input, .look', 'font-size')).toBe('1rem')
  })

  it('make every control a 44px target', async () => {
    expect(await declared('CategoryStrip', '.link', 'min-height')).toBe('44px')
    expect(await declared('ProductRow', '.more', 'min-height')).toBe('44px')
    expect(await declared('SearchField', '.field', 'min-height')).toBe('44px')
    expect(await declared('SearchField', '.clear', 'width')).toBe('44px')
    expect(await declared('SearchField', '.clear', 'height')).toBe('44px')
    expect(await declared('SiteNav', '.link', 'min-height')).toBe('44px')
    expect(await declared('Visit', '.link', 'min-height')).toBe('44px')
  })

  it('give every control a visible focus ring, in the color of the words on a solid part and the accent on paper', async () => {
    expect(await declared('CategoryStrip', '.link:focus-visible', 'outline')).toBe('2px solid var(--tpl-on-solid)')
    expect(await declared('Visit', '.link:focus-visible', 'outline')).toBe('2px solid var(--tpl-on-solid)')
    expect(await declared('SiteNav', '.link:focus-visible', 'outline')).toBe('2px solid var(--menu-accent)')
    expect(await declared('SearchField', '.clear:focus-visible', 'outline')).toBe('2px solid var(--menu-accent)')
    expect(await declared('ProductRow', '.more:focus-visible', 'outline')).toBe('2px solid var(--menu-accent)')
    expect(await declared('SearchField', '.field:focus-within', 'border-bottom-style')).toBe('solid')
  })

  it('theme the text selection in the ink of the sheet', async () => {
    expect(await declared('Template', '.page ::selection', 'color')).toBe('var(--menu-bg)')
    expect(await declared('Template', '.page ::selection', 'background')).toBe('var(--menu-text)')
  })

  it('move only behind prefers-reduced-motion, and only what they may: transforms, opacity, a height through the grid rows', async () => {
    for (const file of FILES) {
      for (const candidate of await rules(file)) {
        const moving = candidate.declarations['transition'] ?? candidate.declarations['animation']
        if (moving === undefined) continue
        expect(candidate.within, candidate.selector).toContain('@media (prefers-reduced-motion: no-preference)')
        expect(moving).toMatch(/^(\s*(transform|opacity|grid-template-rows|visibility) [^,]+,?)+$/)
      }
    }
  })

  it('keep every hover inside a hover query, so a tap leaves nothing stuck', async () => {
    for (const file of FILES) {
      for (const candidate of await rules(file)) {
        if (candidate.selector.includes(':hover')) expect(candidate.within, candidate.selector).toContain('@media (hover: hover) and (pointer: fine)')
      }
    }
  })

  it('open the add-ons by height, and take a closed panel off the page for a screen reader', async () => {
    expect(await declared('ProductRow', '.panel', 'grid-template-rows')).toBe('0fr')
    expect(await declared('ProductRow', '.panel', 'visibility')).toBe('hidden')
    expect(await declared('ProductRow', '.panel[data-open]', 'grid-template-rows')).toBe('1fr')
    expect(await declared('ProductRow', '.panel[data-open]', 'visibility')).toBe('visible')
  })

  it('wait to show a picture only where motion is allowed, on the box that holds its place', async () => {
    expect(await declared('ProductRow', '.fades', 'opacity')).toBeUndefined()
    expect(await declared('ProductRow', '.fades', 'opacity', ['@media (prefers-reduced-motion: no-preference)'])).toBe('0')
    expect(await declared('ProductRow', '.photo', 'aspect-ratio')).toBe('1')
  })

  it('size themselves by the width of the menu (container queries), never by the window', async () => {
    for (const file of FILES) {
      const css = await readCss(`${DIR}/${file}.module.css`)
      expect(css, file).not.toMatch(/@media\s*\(\s*(min|max)-width/)
    }
  })

  it('use no !important, no :global hook and no fixed font family', async () => {
    for (const file of FILES) {
      const css = await readCss(`${DIR}/${file}.module.css`)
      expect(css, file).not.toContain('!important')
      expect(css, file).not.toContain(':global')
      expect(css, file).not.toMatch(/font-family:(?!\s*var\(--menu-)/)
    }
  })

  it('never cut text short', async () => {
    for (const file of FILES) {
      const css = await readCss(`${DIR}/${file}.module.css`)
      expect(css, file).not.toMatch(/line-clamp|text-overflow/)
    }
  })

  it('break a long name inside the sheet, wherever it is printed', async () => {
    expect(await declared('Masthead', '.name', 'overflow-wrap')).toBe('break-word')
    expect(await declared('Template', '.title', 'overflow-wrap')).toBe('break-word')
    expect(await declared('Template', '.none', 'overflow-wrap')).toBe('anywhere')
    expect(await declared('ProductRow', '.name', 'overflow-wrap')).toBe('anywhere')
    expect(await declared('ProductRow', '.name', 'min-width')).toBe('0')
    expect(await declared('ProductRow', '.row[data-photo] .body', 'grid-template-columns')).toBe('minmax(0, 1fr) 80px')
  })

  it('wrap headings and descriptions with care, and line the prices up', async () => {
    expect(await declared('Masthead', '.name', 'text-wrap')).toBe('balance')
    expect(await declared('ProductRow', '.description', 'text-wrap')).toBe('pretty')
    expect(await declared('ProductRow', '.price', 'font-variant-numeric')).toBe('lining-nums tabular-nums')
    expect(await declared('Template', '.title', 'text-wrap')).toBe('balance')
    expect(await declared('ProductRow', '.price', 'white-space')).toBe('nowrap')
  })

  it('keep the categories at the top while the menu is read, with each section stopping just below them', async () => {
    expect(await declared('CategoryStrip', '.strip', 'position')).toBe('sticky')
    expect(await declared('CategoryStrip', '.strip', 'top')).toBe('0')
    expect(await declared('Template', '.page', '--tpl-band')).toBe('46px')
    for (const [file, selector] of [['Template', '.section'], ['Template', '.menu'], ['Visit', '.root']] as const) expect(await declared(file, selector, 'scroll-margin-top')).toBe('var(--tpl-band)')
  })

  it('quiet a sold-out row with its picture only: no opacity on the words', async () => {
    const sold = (await rules('ProductRow')).filter((candidate) => candidate.selector.includes('[data-sold-out]'))
    expect(sold.map(({ selector }) => selector)).toEqual(['[data-sold-out] .photo img'])
    expect(sold[0]?.declarations['opacity']).toBe('0.45')
  })

  it('print every picture in two soft tones of the sheet, with the darker one in the shadows in both modes', async () => {
    expect(await declared('Template', '.page', '--tpl-shade')).toBe('color-mix(in srgb, var(--menu-text) 74%, var(--menu-accent))')
    expect(await declared('Template', '.page', '--tpl-light')).toBe('var(--menu-bg)')
    expect(await declared('Template', ".page[data-mode='dark']", '--tpl-shade')).toBe('color-mix(in srgb, var(--menu-bg) 88%, var(--menu-accent))')
    expect(await declared('Template', ".page[data-mode='dark']", '--tpl-light')).toBe('var(--menu-text)')
    expect(await declared('ProductRow', '.photo::before', 'mix-blend-mode')).toBe('screen')
    expect(await declared('ProductRow', '.photo::after', 'mix-blend-mode')).toBe('multiply')
  })

  it('draw nothing where a shop has no contact lines', async () => {
    expect(await declared('Template', '.closing:empty', 'display')).toBe('none')
  })

  it('set the band and the Visit block in solid ink by day, and on the paper between rules at night, where pale ink would glare', async () => {
    expect(await declared('Template', '.page', '--tpl-solid')).toBe('var(--menu-text)')
    expect(await declared('Template', '.page', '--tpl-on-solid')).toBe('var(--menu-bg)')
    expect(await declared('Template', ".page[data-mode='dark']", '--tpl-solid')).toBe('var(--menu-bg)')
    expect(await declared('Template', ".page[data-mode='dark']", '--tpl-on-solid')).toBe('var(--menu-text)')
    for (const [file, selector] of [['CategoryStrip', '.strip'], ['Visit', '.root']] as const) {
      expect(await declared(file, selector, 'background')).toBe('var(--tpl-solid)')
      expect(await declared(file, selector, 'color')).toBe('var(--tpl-on-solid)')
    }
  })

  it('stack the rows in the List layout, and only lay the categories side by side on a wide sheet', async () => {
    const all = await rules('Template')
    expect(rule(all, '.list')?.declarations['grid-template-columns']).toBeUndefined()
    expect(rule(all, '.sections')?.declarations['columns']).toBeUndefined()
    expect(rule(all, '.sections', [WIDE])?.declarations['columns']).toBe('2')
  })

  it('put two columns of items in the Grid layout, three on a wide sheet with one column of categories', async () => {
    const all = await rules('Template')
    expect(rule(all, ".page[data-layout='grid'] .list")?.declarations['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))')
    expect(rule(all, ".page[data-layout='grid'] .list", [WIDE])?.declarations['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))')
    expect(rule(all, ".page[data-layout='grid'] .sections", [WIDE])?.declarations['columns']).toBe('1')
  })

  it('take the leaders out of a Grid row and put the price under the name, with the picture on top', async () => {
    expect(await declared('ProductRow', "[data-layout='grid'] .leader", 'display')).toBe('none')
    expect(await declared('ProductRow', "[data-layout='grid'] .head", 'display')).toBe('block')
    expect(await declared('ProductRow', "[data-layout='grid'] .price", 'display')).toBe('block')
    expect(await declared('ProductRow', "[data-layout='grid'] .photo", 'order')).toBe('-1')
    expect(await declared('ProductRow', "[data-layout='grid'] .body", 'display')).toBe('contents')
  })
})

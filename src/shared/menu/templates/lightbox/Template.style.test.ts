import { describe, expect, it } from 'vitest'
import { allCss, readCss, rulesOf, type CssRule } from '@/test/css'

/* What the stylesheets of Lightbox promise. Vitest does not load CSS, so the rules are read from disk; the shared rules (no color of
   its own, text on its own ground, sold-out quieting) are checked for every stylesheet of the menu by menuStyleRules.test.ts. */

const DIR = 'src/shared/menu/templates/lightbox'
const FILES = ['CategoryStrip', 'Opening', 'Panel', 'Template', 'Visit']
const WIDE = '@container (min-width: 640px)'

async function rules(name: string): Promise<CssRule[]> {
  return rulesOf(await readCss(`${DIR}/${name}.module.css`))
}
const rule = (all: CssRule[], selector: string, within: string[] = []) => all.find((candidate) => candidate.selector === selector && candidate.within.join('|') === within.join('|'))
const declared = async (file: string, selector: string, property: string, within: string[] = []) => rule(await rules(file), selector, within)?.declarations[property]

describe('the Lightbox stylesheets', () => {
  it('are the ones this test goes through: a new stylesheet has to join the list', async () => {
    const found = (await allCss())
      .map(({ path }) => path.replaceAll('\\', '/'))
      .filter((path) => path.startsWith(`${DIR}/`))
      .map((path) => path.slice(DIR.length + 1).replace('.module.css', ''))
    expect(found.sort()).toEqual(FILES)
  })

  it('never tone a photo: no filter, no blend, nothing laid over it, and it fills a box that keeps its shape', async () => {
    for (const file of FILES) expect(await readCss(`${DIR}/${file}.module.css`), file).not.toMatch(/\bfilter\b|mix-blend-mode/)
    expect(await declared('Panel', '.photo', 'aspect-ratio')).toBe('4 / 3')
    expect(await declared('Panel', "[data-layout='grid'] .photo", 'aspect-ratio')).toBe('1')
    expect(await declared('Panel', '.photo img', 'object-fit')).toBe('cover')
    expect(await declared('Panel', '.photo img', 'object-position')).toBe('center')
  })

  it('draw the panels with square corners and no shadow', async () => {
    for (const file of FILES) expect(await readCss(`${DIR}/${file}.module.css`), file).not.toMatch(/border-radius|box-shadow/)
    expect(await declared('Template', '.list', 'gap')).toBe('var(--tpl-seam)')
  })

  it('hang the price under a brass line, with lining figures of one width', async () => {
    expect(await declared('Panel', '.price', 'border-top')).toBe('2px solid var(--menu-accent)')
    expect(await declared('Panel', '.price', 'font-variant-numeric')).toBe('lining-nums tabular-nums')
    expect(await declared('Panel', '.price', 'white-space')).toBe('nowrap')
  })

  it('paint the wall, the panels and the closing panel from the theme, moved for dark', async () => {
    expect(await declared('Template', '.page', '--tpl-frame')).toBe('color-mix(in srgb, var(--menu-accent) 12%, var(--menu-bg))')
    expect(await declared('Template', '.page', '--tpl-panel')).toBe('var(--menu-bg)')
    expect(await declared('Template', '.page', '--tpl-closing')).toBe('var(--tpl-panel)')
    expect(await declared('Template', '.page', '--tpl-on-closing')).toBe('var(--menu-text)')
    expect(await declared('Template', ".page[data-mode='dark']", '--tpl-frame')).toBe('var(--menu-bg)')
    expect(await declared('Template', ".page[data-mode='dark']", '--tpl-panel')).toBe('color-mix(in srgb, var(--menu-accent) 12%, var(--menu-bg))')
    expect(await declared('Panel', '.panel', 'background')).toBe('var(--tpl-panel)')
    expect(await declared('CategoryStrip', '.strip', 'background')).toBe('var(--tpl-frame)')
    expect(await declared('Visit', '.root', 'background')).toBe('var(--tpl-closing)')
  })

  it('put the closing lines on the page photo, in the page text, when there is one', async () => {
    const all = (await rules('Visit')).filter(({ selector }) => selector.includes('data-menu-backdrop'))
    expect(all.length).toBeGreaterThan(0)
    for (const { declarations } of all) {
      expect(declarations['--tpl-on-closing']).toBe('var(--menu-text)')
      expect(declarations['background']).toBe('none')
    }
  })

  it('reach the end of the screen over the bottom padding of the menu root, clear of the home bar', async () => {
    expect(await declared('Template', '.page', 'margin-bottom')).toBe('-24px')
    expect(await declared('Visit', '.root', 'padding')).toContain('env(safe-area-inset-bottom)')
  })

  it('set a name with no photo larger than one with a photo, in both layouts', async () => {
    expect(await declared('Panel', '.name', 'font-size')).toBe('1.4375rem')
    expect(await declared('Panel', '.panel:not([data-photo]) .name', 'font-size')).toBe('1.75rem')
    expect(await declared('Panel', "[data-layout='grid'] .name", 'font-size')).toBe('1.125rem')
    expect(await declared('Panel', "[data-layout='grid'] .panel:not([data-photo]) .name", 'font-size')).toBe('clamp(1.25rem, 6.2cqi, 1.625rem)')
  })

  it('make every control a 44px target with a visible focus ring', async () => {
    expect(await declared('CategoryStrip', '.link', 'min-height')).toBe('44px')
    expect(await declared('Opening', '.link', 'min-height')).toBe('44px')
    expect(await declared('Panel', '.more', 'min-height')).toBe('44px')
    for (const file of ['CategoryStrip', 'Opening']) expect(await declared(file, '.link:focus-visible', 'outline')).toBe('2px solid var(--menu-accent)')
    expect(await declared('Panel', '.more:focus-visible', 'outline')).toBe('2px solid var(--menu-accent)')
    expect(await declared('Visit', '.link:focus-visible', 'outline')).toBe('2px solid var(--tpl-closing-accent)')
  })

  it('theme the text selection in the brass', async () => {
    expect(await declared('Template', '.page ::selection', 'color')).toBe('var(--menu-on-fill)')
    expect(await declared('Template', '.page ::selection', 'background')).toBe('var(--menu-fill)')
  })

  it('are sized by the width of the menu, and use no !important, :global hook or fixed font family', async () => {
    for (const file of FILES) {
      const css = await readCss(`${DIR}/${file}.module.css`)
      expect(css, file).not.toMatch(/@media\s*\(\s*(min|max)-width/)
      expect(css, file).not.toContain('!important')
      expect(css, file).not.toContain(':global')
      expect(css, file).not.toMatch(/font-family:(?!\s*var\(--menu-)/)
    }
  })

  it('keep all motion for people who have not asked for calm, and move only what the brief allows', async () => {
    for (const file of FILES) {
      const moving = (await rules(file)).filter(({ declarations }) => declarations['transition'] !== undefined || declarations['animation'] !== undefined)
      for (const { selector, within, declarations } of moving) {
        expect(within, `${file} ${selector}`).toContain('@media (prefers-reduced-motion: no-preference)')
        expect(declarations['transition'], `${file} ${selector}`).toMatch(/^(transform|opacity|grid-template-rows)\b/)
      }
    }
  })

  it('move the mark with a transform alone, and only once the row says it may', async () => {
    expect(await declared('CategoryStrip', '.list::after', 'transform')).toContain('scaleX(var(--tpl-mark-width, 0))')
    expect(await declared('CategoryStrip', '.list[data-glide]::after', 'transition', ['@media (prefers-reduced-motion: no-preference)'])).toBe('transform var(--tpl-duration-open) var(--tpl-ease-move)')
  })

  it('open the add-ons by height, and take them out of the reading order when shut', async () => {
    expect(await declared('Panel', '.addOns', 'grid-template-rows')).toBe('0fr')
    expect(await declared('Panel', '.addOns', 'visibility')).toBe('hidden')
    expect(await declared('Panel', '.addOns[data-open]', 'grid-template-rows')).toBe('1fr')
    expect(await declared('Panel', '.addOns[data-open]', 'visibility')).toBe('visible')
    expect(await declared('Panel', '.addOnsInner', 'overflow')).toBe('hidden')
  })

  it('keep a hover effect to a device that can hover', async () => {
    for (const file of FILES) {
      for (const { selector, within } of await rules(file)) {
        if (selector.includes(':hover')) expect(within, `${file} ${selector}`).toContain('@media (hover: hover) and (pointer: fine)')
      }
    }
  })

  it('never cut text short, and break a long name inside its panel', async () => {
    for (const file of FILES) expect(await readCss(`${DIR}/${file}.module.css`), file).not.toMatch(/line-clamp|text-overflow/)
    expect(await declared('Opening', '.name', 'overflow-wrap')).toBe('break-word')
    expect(await declared('Template', '.title', 'overflow-wrap')).toBe('break-word')
    expect(await declared('Panel', '.name', 'overflow-wrap')).toBe('anywhere')
    expect(await declared('Panel', '.panel', 'min-width')).toBe('0')
    expect(await declared('Panel', '.strip', 'grid-template-columns')).toBe('minmax(0, 1fr) auto')
  })

  it('wrap headings and descriptions with care', async () => {
    expect(await declared('Opening', '.name', 'text-wrap')).toBe('balance')
    expect(await declared('Template', '.title', 'text-wrap')).toBe('balance')
    expect(await declared('Panel', '.name', 'text-wrap')).toBe('balance')
    expect(await declared('Panel', '.description', 'text-wrap')).toBe('pretty')
  })

  it('keep the categories at the top while the menu is read, with each section stopping just below them', async () => {
    expect(await declared('CategoryStrip', '.strip', 'position')).toBe('sticky')
    expect(await declared('CategoryStrip', '.strip', 'top')).toBe('0')
    expect(await declared('Template', '.section', 'scroll-margin-top')).toBe('45px')
  })

  it('turn off the light of a sold-out panel with its picture only: no opacity on the words', async () => {
    const sold = (await rules('Panel')).filter((candidate) => candidate.selector.includes('[data-sold-out]'))
    expect(sold.map(({ selector }) => selector)).toEqual(['[data-sold-out] .photo img'])
    expect(sold[0]?.declarations['opacity']).toBe('0.4')
  })

  it('stack one panel per row in the List layout, two in the Grid layout, three on a wide sheet', async () => {
    const all = await rules('Template')
    expect(rule(all, '.list')?.declarations['grid-template-columns']).toBeUndefined()
    expect(rule(all, ".page[data-layout='grid'] .list")?.declarations['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))')
    expect(rule(all, ".page[data-layout='grid'] .list", [WIDE])?.declarations['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))')
  })

  it('line the strips of a Grid row up, and let a panel with no photo take the place of the photo', async () => {
    expect(await declared('Panel', "[data-layout='grid'] .panel", 'grid-template-rows')).toBe('subgrid')
    expect(await declared('Panel', "[data-layout='grid'] .panel", 'grid-row')).toBe('span 3')
    expect(await declared('Panel', "[data-layout='grid'] .panel:not([data-photo]) .strip", 'grid-row')).toBe('1 / span 2')
  })
})

import { describe, expect, it } from 'vitest'
import { readCss, rulesOf } from '@/test/css'

/* What the stylesheets of Beanhouse promise. Vitest does not load CSS, so they are read from disk; the rules every stylesheet of the
   menu shares are checked by menuStyleRules.test.ts. */

const DIR = 'src/shared/menu/templates/beanhouse'
const FILES = ['Template', 'SiteFold', 'Stamp', 'CategoryLabels', 'ProductRow', 'TornEdge']
const rules = async (name: string) => rulesOf(await readCss(`${DIR}/${name}.module.css`))

describe('the Beanhouse stylesheets', () => {
  it('keep the category labels on the screen, on the paper of the bag', async () => {
    const strip = (await rules('CategoryLabels')).find(({ selector }) => selector === '.strip')
    expect(strip?.declarations['position']).toBe('sticky')
    expect(strip?.declarations['background-color']).toBe('var(--menu-bg)')
  })

  it('make every control a 44px target with a visible focus ring in the accent', async () => {
    const link = await rules('CategoryLabels')
    const row = await rules('ProductRow')
    const fold = await rules('SiteFold')
    expect(fold.find(({ selector }) => selector === '.link')?.declarations['min-height']).toBe('44px')
    expect(fold.find(({ selector }) => selector === '.link:focus-visible')?.declarations['outline']).toBe('2px solid var(--menu-accent)')
    expect(link.find(({ selector }) => selector === '.link')?.declarations['min-height']).toBe('44px')
    expect(row.find(({ selector }) => selector === '.more')?.declarations['min-height']).toBe('44px')
    expect(link.find(({ selector }) => selector === '.link:focus-visible')?.declarations['outline']).toBe('2px solid var(--menu-accent)')
    expect(row.find(({ selector }) => selector === '.more:focus-visible')?.declarations['outline']).toBe('2px solid var(--menu-accent)')
  })

  it('never cut a name or a description short', async () => {
    for (const { selector, declarations } of await rules('ProductRow')) {
      if (selector !== '.name' && selector !== '.description') continue
      expect(declarations['-webkit-line-clamp']).toBeUndefined()
      expect(declarations['text-overflow']).toBeUndefined()
    }
  })

  it('put a photo in its natural color, and quiet only the photo of a sold-out item', async () => {
    const all = await rules('ProductRow')
    expect(all.find(({ selector }) => selector === '.photo img')?.declarations['filter']).toBeUndefined()
    const sold = all.filter(({ selector }) => selector.includes('[data-sold-out]'))
    expect(sold.map(({ selector }) => selector)).toEqual(['[data-sold-out] .photo img'])
  })

  it('open the add-ons by height with the words kept on the page, and hide them from a screen reader while closed', async () => {
    const row = await rules('ProductRow')
    const closed = row.find(({ selector }) => selector === '.panel')?.declarations
    const open = row.find(({ selector }) => selector === '.panel[data-open]')?.declarations
    expect(closed).toMatchObject({ 'grid-template-rows': '0fr', visibility: 'hidden' })
    expect(open).toMatchObject({ 'grid-template-rows': '1fr', visibility: 'visible' })
  })

  it('move only behind prefers-reduced-motion and hover only behind a real pointer', async () => {
    for (const file of FILES) {
      const css = await readCss(`${DIR}/${file}.module.css`)
      const free = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, '')
      expect(free, file).not.toMatch(/\btransition\b|\banimation\b/)
      expect(free, file).not.toContain(':hover')
    }
  })

  it('lay Grid out in two columns on the label', async () => {
    const list = (await rules('Template')).find(({ selector }) => selector === ".page[data-layout='grid'] .list")
    expect(list?.declarations['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))')
  })

  it('size themselves by the width of the menu, and use no !important, :global hook or fixed font', async () => {
    for (const file of FILES) {
      const css = await readCss(`${DIR}/${file}.module.css`)
      expect(css, file).not.toMatch(/@media\s*\(\s*(min|max)-width/)
      expect(css, file).not.toContain('!important')
      expect(css, file).not.toContain(':global')
      expect(css, file).not.toMatch(/font-family:(?!\s*var\(--menu-)/)
    }
  })
})

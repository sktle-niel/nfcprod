import { describe, expect, it } from 'vitest'
import { mediaBlock, readCss, ruleBody, rulesOf } from '@/test/css'

/*
 * What the stylesheets of the line art promise: one faint layer behind the content that takes no clicks and cannot make the
 * page scroll sideways; pieces sized by the menu's width (so they scale from 360 to 720 px) and never wider than it; strokes
 * that keep their width; nothing that moves.
 */

const DIR = 'src/shared/menu/decor'
const SETS = ['Coffee', 'Leaves', 'Dining', 'Bakery', 'Bar', 'Sparkles']

describe('the decoration layer', () => {
  it('covers the menu behind the content, takes no clicks and is clipped', async () => {
    const layer = ruleBody(await readCss(`${DIR}/Decor.module.css`), '.decor')
    expect(layer).toMatch(/position:\s*absolute/)
    expect(layer).toMatch(/inset:\s*0/)
    expect(layer).toMatch(/z-index:\s*0/)
    expect(layer).toMatch(/overflow:\s*clip/)
    expect(layer).toMatch(/pointer-events:\s*none/)
    expect(layer).toMatch(/color:\s*var\(--menu-muted\)/)
  })

  it('draws every piece faintly (0.14 to 0.28) with strokes that keep their width', async () => {
    const css = await readCss(`${DIR}/Decor.module.css`)
    const opacity = Number(/opacity:\s*([\d.]+)/.exec(ruleBody(css, '.decor svg'))?.[1])
    expect(opacity).toBeGreaterThanOrEqual(0.14)
    expect(opacity).toBeLessThanOrEqual(0.28)
    expect(ruleBody(css, '.decor svg *')).toMatch(/vector-effect:\s*non-scaling-stroke/)
  })

  it('steps aside with forced colors', async () => {
    expect(mediaBlock(await readCss(`${DIR}/Decor.module.css`), '(forced-colors: active)')).toMatch(/display:\s*none/)
  })
})

describe.each(SETS)('the %s set', (set) => {
  it('sizes every piece as a share of the menu width, capped in em, never wider than the menu', async () => {
    const rules = rulesOf(await readCss(`${DIR}/${set}Decor.module.css`))
    expect(rules.length).toBeGreaterThanOrEqual(3)
    for (const { selector, declarations } of rules) {
      const width = declarations['width'] ?? ''
      expect(width, selector).toMatch(/^\d+(\.\d+)?%$/)
      expect(Number.parseFloat(width), selector).toBeLessThanOrEqual(35)
      expect(declarations['max-width'] ?? '', selector).toMatch(/^\d+(\.\d+)?em$/)
    }
  })

  it('keeps to the edges: every piece is pinned to the top or the bottom, and to the left or the right', async () => {
    for (const { selector, declarations } of rulesOf(await readCss(`${DIR}/${set}Decor.module.css`))) {
      expect('top' in declarations || 'bottom' in declarations, selector).toBe(true)
      expect('left' in declarations || 'right' in declarations, selector).toBe(true)
    }
  })

  it('does not move and does not change its faintness', async () => {
    const css = await readCss(`${DIR}/${set}Decor.module.css`)
    expect(css).not.toMatch(/animation|transition|opacity/)
  })
})

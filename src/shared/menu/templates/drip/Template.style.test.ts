import { describe, expect, it } from 'vitest'
import { readCss, rulesOf } from '@/test/css'

const SHEETS = ['AddOns', 'Band', 'CategoryLine', 'Row', 'Section', 'SiteNav', 'Template', 'Visit'].map((name) => `src/shared/menu/templates/drip/${name}.module.css`)

/** Every rule of the sheets, with the at-rules around it. */
async function allRules() {
  return (await Promise.all(SHEETS.map(readCss))).flatMap((css) => rulesOf(css))
}

describe('the motion of the Drip sheets', () => {
  it('runs only when motion is welcome', async () => {
    const moving = (await allRules()).filter(({ declarations }) => declarations['transition'] !== undefined || declarations['animation'] !== undefined)
    expect(moving.length).toBeGreaterThan(0)
    for (const rule of moving) expect(rule.within.join(), rule.selector).toContain('prefers-reduced-motion: no-preference')
  })

  it('names what it moves: transform, opacity, and the height of the add-ons with their visibility', async () => {
    const allowed = new Set(['transform', 'opacity', 'grid-template-rows', 'visibility'])
    for (const rule of await allRules()) {
      const parts = (rule.declarations['transition'] ?? '').split(',').filter((part) => part.trim() !== '')
      for (const part of parts) expect(allowed.has(part.trim().split(' ')[0] ?? ''), `${rule.selector}: ${part}`).toBe(true)
    }
  })

  it('never holds the pour after it has run', async () => {
    const pour = (await allRules()).find((rule) => rule.selector.includes('data-pours'))
    expect(pour?.declarations['animation']).toMatch(/ backwards$/)
  })

  it('keeps a hover behind a device that can hover', async () => {
    for (const rule of await allRules()) {
      if (rule.selector.includes(':hover')) expect(rule.within.join(), rule.selector).toContain('(hover: hover)')
    }
  })
})

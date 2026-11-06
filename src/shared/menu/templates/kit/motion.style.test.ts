import { describe, expect, it } from 'vitest'
import { readCss, rulesOf } from '@/test/css'

const MOTION = 'src/shared/menu/templates/kit/motion.module.css'
const VALUE_SHEET = 'src/shared/theme/tokens.css'
const CALM = '@media screen and (prefers-reduced-motion: no-preference)'

const ms = (value: string | undefined) => Number.parseInt(value ?? '', 10)

describe('the motion stylesheet of the templates', () => {
  it('moves nothing unless motion is welcome, a printed page included', async () => {
    const rules = rulesOf(await readCss(MOTION)).filter((rule) => !rule.within.some((at) => at.startsWith('@keyframes')))
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) expect(rule.within, rule.selector).toEqual([CALM])
  })

  it('moves only transform and opacity, and names them', async () => {
    const css = await readCss(MOTION)
    expect(css).not.toMatch(/transition:\s*all/)
    for (const rule of rulesOf(css)) {
      for (const [property, value] of Object.entries(rule.declarations)) {
        if (property === 'transition') expect(value.split(',').map((part) => part.trim().split(' ')[0]).every((name) => name === 'opacity' || name === 'transform')).toBe(true)
      }
    }
  })

  it('never fills forwards: nothing is held after the entrance', async () => {
    const opening = rulesOf(await readCss(MOTION)).find((rule) => rule.selector === '.opening')
    expect(opening?.declarations['animation']).toMatch(/ backwards$/)
  })

  it('keeps the values inside the rules of the brief, on the app ease', async () => {
    const root = rulesOf(await readCss(VALUE_SHEET)).find((rule) => rule.selector === ':root')?.declarations ?? {}
    expect(root['--tpl-ease']).toBe('var(--ease-out)')
    expect(root['--tpl-ease-move']).toBe('var(--ease-in-out)')
    for (const name of ['press', 'small', 'open']) expect(ms(root[`--tpl-duration-${name}`]), name).toBeLessThan(300)
    expect(ms(root['--tpl-duration-opening']) + 2 * ms(root['--tpl-stagger'])).toBeLessThanOrEqual(700)
    expect(ms(root['--tpl-duration-reveal'])).toBeLessThanOrEqual(500)
  })
})

import { describe, expect, it } from 'vitest'
import { contrastRatio, mixHex } from '@/entities/theme/color'
import { toCssVars } from '@/entities/theme/cssVars'
import { styleTheme } from '@/entities/theme/styles'
import { MODES } from '@/entities/theme/theme'
import { TEXT_CONTRAST_MIN } from '@/entities/theme/validate'
import { readCss, rulesOf } from '@/test/css'

const page = async () => rulesOf(await readCss('src/shared/menu/templates/nightglass/Template.module.css'))

describe('Night Glass: the stylesheet', () => {
  it('keeps the active category name readable: the lit tone holds on the board in both modes', () => {
    for (const mode of MODES) {
      const vars = toCssVars(styleTheme('nightglass', mode))
      const lit = mixHex(vars['--menu-accent'] ?? '', vars['--menu-text'] ?? '', 0.5)
      expect(contrastRatio(lit ?? '', vars['--menu-bg'] ?? '')).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN)
    }
  })

  it('makes the lamp of the accent, not of a color of its own, and lets it screen so the lettering stays as it is', async () => {
    const lamp = (await page()).find((rule) => rule.selector === '.board::after')?.declarations
    expect(lamp?.['background']).toContain('radial-gradient')
    expect(lamp?.['background']).toContain('var(--menu-accent)')
    expect(lamp?.['mix-blend-mode']).toBe('screen')
    expect(lamp?.['pointer-events']).toBe('none')
  })

  it('brings the lamp up once, on the page only, by its opacity, and never for a person who asked for calm', async () => {
    const css = await readCss('src/shared/menu/templates/nightglass/Template.module.css')
    expect(css).toMatch(/@media screen and \(prefers-reduced-motion: no-preference\) \{\s*\.page\[data-live\] \.board::after \{\s*animation: lamp-up/)
    expect(css).toMatch(/@keyframes lamp-up \{\s*from \{\s*opacity: 0;\s*\}\s*\}/)
    expect(css).not.toMatch(/infinite/)
  })

  it('moves only by transform, opacity and the height of the add-ons, each behind the calm setting', async () => {
    const sheets = await Promise.all(['BoardRow', 'BoardSection', 'CategoryRail', 'SiteNav', 'BoardVisit', 'Masthead'].map((name) => readCss(`src/shared/menu/templates/nightglass/${name}.module.css`)))
    for (const css of sheets) {
      for (const [, value] of css.matchAll(/transition:\s*([^;]+);/g)) {
        for (const part of (value ?? '').split(',')) expect(part.trim().split(/\s+/)[0]).toMatch(/^(transform|opacity|grid-template-rows|visibility)$/)
      }
      const open = css.indexOf('transition')
      if (open >= 0) expect(css.lastIndexOf('prefers-reduced-motion: no-preference', open)).toBeGreaterThanOrEqual(0)
    }
  })

  it('gates every hover behind a pointer that can hover', async () => {
    for (const name of ['CategoryRail', 'SiteNav', 'BoardVisit']) {
      const css = await readCss(`src/shared/menu/templates/nightglass/${name}.module.css`)
      const hover = css.indexOf(':hover')
      expect(css.lastIndexOf('@media (hover: hover) and (pointer: fine)', hover)).toBeGreaterThanOrEqual(0)
    }
  })

  it('has no lamp by day', async () => {
    const off = (await page()).find((rule) => rule.selector.includes(".page[data-mode='light'] .board::after"))
    expect(off?.declarations['display']).toBe('none')
  })
})

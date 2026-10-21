import { describe, expect, it } from 'vitest'
import { declaredValue } from './MapPicker.stylekit'

// The map stays light in both themes, but the credit on it follows the theme. Vitest does not load CSS and jsdom mixes no
// colors, so the stylesheet and the tokens are read from disk (MapPicker.stylekit.ts) and the contrast is worked out here.
const THEME_FILE = '../../../shared/theme/tokens.css'
const THEMES = { light: ':root', dark: ":root[data-theme='dark']" } as const
type Rgb = readonly [number, number, number]
// What may be under the chip: white, and the grey of the water on the light style, its darkest wide area.
const BEHIND: readonly Rgb[] = [
  [255, 255, 255],
  [194, 200, 202],
]
// WCAG's bar for small text.
const READABLE = 4.5

async function themeColor(theme: keyof typeof THEMES, name: string): Promise<Rgb> {
  const value = await declaredValue(THEME_FILE, THEMES[theme], name)
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value ?? '')
  if (!hex) throw new Error(`${name} in the ${theme} theme is not a plain #rrggbb color: ${value}`)
  return [Number.parseInt(hex[1]!, 16), Number.parseInt(hex[2]!, 16), Number.parseInt(hex[3]!, 16)]
}

const channel = (value: number) => {
  const share = value / 255
  return share <= 0.04045 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: Rgb, b: Rgb) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}
/** `top` painted at `opacity` over `under`. */
const over = (top: Rgb, opacity: number, under: Rgb): Rgb => [
  top[0] * opacity + under[0] * (1 - opacity),
  top[1] * opacity + under[1] * (1 - opacity),
  top[2] * opacity + under[2] * (1 - opacity),
]

describe('PinMap credit', () => {
  it('stays readable on the light map in both themes: a mostly opaque chip in the theme surface, with the soft text color', async () => {
    const background = await declaredValue('PinMap.module.css', '.credits', 'background')
    const opacity = /^color-mix\(in srgb, var\(--color-surface\) (\d+)%, transparent\)$/.exec(background ?? '')?.[1]
    if (opacity === undefined) throw new Error(`The credit chip is not the theme surface at some opacity: ${background}`)
    expect(await declaredValue('PinMap.module.css', '.credits', 'color')).toBe('var(--color-ink-soft)')

    for (const theme of ['light', 'dark'] as const) {
      const surface = await themeColor(theme, '--color-surface')
      const text = await themeColor(theme, '--color-ink-soft')
      for (const behind of BEHIND) {
        const ratio = contrast(text, over(surface, Number(opacity) / 100, behind))
        expect(ratio, `${theme} theme, over ${behind.join(',')}`).toBeGreaterThanOrEqual(READABLE)
      }
    }
  })

  it('finds the old glass chip unreadable, so the check above is not an empty one', async () => {
    // The old chip was the glass token: 6% white in the dark theme, so light text on the light map. The same working-out
    // must reject it.
    const text = await themeColor('dark', '--color-ink-soft')
    const glass = over([255, 255, 255], 0.06, [194, 200, 202])
    expect(contrast(text, glass)).toBeLessThan(READABLE)
  })
})

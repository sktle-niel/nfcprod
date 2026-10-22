import { photoGrounds } from '@/entities/theme/backdrop'
import { contrastRatio, mixHex, readableOn, WHITE } from '@/entities/theme/color'
import { DEFAULT_THEME, VEILS, type Theme } from '@/entities/theme/theme'
import { ACCENT_CONTRAST_MIN, TEXT_CONTRAST_MIN, type ThemeIssue } from '@/entities/theme/validate'
import { isOneOf } from '@/shared/lib/checks'

const BLACK = '#000000'

/** One color of the theme to change, and what to change it to. */
export type ContrastFix = { key: 'secondary' | 'primary'; color: string }

/** Every ground the page text must read on: the page, and under a photo backdrop its two worst veiled grounds (the same ones `themeIssues` warns about). */
function textGrounds(theme: Theme): string[] {
  if (theme.backdrop !== 'picture' || theme.backdropPicture === null) return [theme.background]
  const veil = isOneOf(VEILS, theme.backdropVeil) ? theme.backdropVeil : DEFAULT_THEME.backdropVeil
  return [theme.background, ...photoGrounds(theme.background, veil)]
}

/**
 * A text color that reads on every ground: the ink or white of `readableOn`, else plain white or black. On a page alone
 * one of them always reaches 4.5:1; under a photo on a mid-tone page none may, and then there is no color to offer (null).
 */
function textColorFor(theme: Theme): string | null {
  const grounds = textGrounds(theme)
  for (const candidate of [readableOn(theme.background), WHITE, BLACK]) {
    if (grounds.every((ground) => contrastRatio(candidate, ground) >= TEXT_CONTRAST_MIN)) return candidate
  }
  return null
}

/** The accent moved toward the text side of the page, a tenth at a time, until it shows: the hue is kept as long as it can be. */
function accentColorFor(accent: string, background: string): string {
  const target = readableOn(background)
  for (let step = 1; step <= 10; step += 1) {
    const mixed = mixHex(accent, target, step / 10)
    if (mixed !== null && contrastRatio(mixed, background) >= ACCENT_CONTRAST_MIN) return mixed
  }
  return target
}

/**
 * The change that clears `issue`, or null when no text color can read over the photo on this page (the remedy is a
 * softer veil or another page color, not a text color). The theme's colors must be valid `#rrggbb`.
 */
export function contrastFix(issue: ThemeIssue, theme: Theme): ContrastFix | null {
  if (issue === 'textContrast') {
    const color = textColorFor(theme)
    return color === null ? null : { key: 'secondary', color }
  }
  return { key: 'primary', color: accentColorFor(theme.primary, theme.background) }
}

import { contrastRatio, mixHex, readableOn, WHITE } from '@/entities/theme/color'
import type { Theme } from '@/entities/theme/theme'
import { ACCENT_CONTRAST_MIN, TEXT_CONTRAST_MIN, type ThemeIssue } from '@/entities/theme/validate'

const BLACK = '#000000'

/** One color of the theme to change, and what to change it to. */
export type ContrastFix = { key: 'secondary' | 'primary'; color: string }

/** A text color that reads on `background`: the ink or white of `readableOn`, and plain black or white when neither is enough. */
function textColorFor(background: string): string {
  const usual = readableOn(background)
  if (contrastRatio(usual, background) >= TEXT_CONTRAST_MIN) return usual
  return contrastRatio(BLACK, background) > contrastRatio(WHITE, background) ? BLACK : WHITE
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

/** The change that clears `issue`. The theme's colors must be valid `#rrggbb`. */
export function contrastFix(issue: ThemeIssue, theme: Theme): ContrastFix {
  return issue === 'textContrast'
    ? { key: 'secondary', color: textColorFor(theme.background) }
    : { key: 'primary', color: accentColorFor(theme.primary, theme.background) }
}

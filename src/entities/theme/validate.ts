import { checkBoolean, checkOneOf, combine, fail, isMissing, isOneOf, pass, readField, safely, type Check } from '@/shared/lib/checks'
import type { Validated } from '@/shared/lib/validation'
import { checkImageAddress } from '@/entities/menu/image'
import { photoGrounds } from './backdrop'
import { contrastRatio, isHexColor, normalizeHex } from './color'
import {
  BACKDROPS,
  BUTTON_STYLES,
  CARDS,
  DECORS,
  DEFAULT_THEME,
  FONTS,
  HEADERS,
  LAYOUTS,
  MODES,
  PHOTO_FITS,
  PHOTO_POSITIONS,
  PHOTOS,
  STYLE_IDS,
  TITLES,
  VEILS,
  type Theme,
} from './theme'

function checkColor(value: unknown): Check<string> {
  if (isMissing(value)) return fail('required')
  return isHexColor(value) ? pass(normalizeHex(value)) : fail('invalid')
}

/** The card color: missing or null is the automatic one. */
function checkSurface(value: unknown): Check<string | null> {
  if (isMissing(value)) return pass(null)
  return isHexColor(value) ? pass(normalizeHex(value)) : fail('invalid')
}

/** A choice that older themes do not have: missing is the default, anything else must be on its list. */
function orDefault<T>(value: unknown, fallback: T, check: (value: unknown) => Check<T>): Check<T> {
  return isMissing(value) ? pass(fallback) : check(value)
}

/**
 * A clean theme from outside input: the colors `#rrggbb` (stored lowercase), the rest from their lists. A missing key
 * is 'required' for the three colors, the font, the corners, the layout and the mode, and the default for the choices
 * added later (the style and what it sets, and the card color), so a theme saved before them still reads. Anything else
 * wrong is 'invalid'. Keys a theme does not have are dropped.
 */
export function validateTheme(input: unknown): Validated<Theme, keyof Theme> {
  return safely<Theme, keyof Theme>('primary', () =>
    combine({
      primary: checkColor(readField(input, 'primary')),
      secondary: checkColor(readField(input, 'secondary')),
      background: checkColor(readField(input, 'background')),
      surface: checkSurface(readField(input, 'surface')),
      style: orDefault(readField(input, 'style'), DEFAULT_THEME.style, (value) => checkOneOf(STYLE_IDS, value)),
      card: orDefault(readField(input, 'card'), DEFAULT_THEME.card, (value) => checkOneOf(CARDS, value)),
      photo: orDefault(readField(input, 'photo'), DEFAULT_THEME.photo, (value) => checkOneOf(PHOTOS, value)),
      title: orDefault(readField(input, 'title'), DEFAULT_THEME.title, (value) => checkOneOf(TITLES, value)),
      header: orDefault(readField(input, 'header'), DEFAULT_THEME.header, (value) => checkOneOf(HEADERS, value)),
      decor: orDefault(readField(input, 'decor'), DEFAULT_THEME.decor, (value) => checkOneOf(DECORS, value)),
      backdrop: orDefault(readField(input, 'backdrop'), DEFAULT_THEME.backdrop, (value) => checkOneOf(BACKDROPS, value)),
      backdropPicture: orDefault(readField(input, 'backdropPicture'), DEFAULT_THEME.backdropPicture, checkImageAddress),
      backdropVeil: orDefault(readField(input, 'backdropVeil'), DEFAULT_THEME.backdropVeil, (value) => checkOneOf(VEILS, value)),
      backdropFit: orDefault(readField(input, 'backdropFit'), DEFAULT_THEME.backdropFit, (value) => checkOneOf(PHOTO_FITS, value)),
      backdropPosition: orDefault(readField(input, 'backdropPosition'), DEFAULT_THEME.backdropPosition, (value) =>
        checkOneOf(PHOTO_POSITIONS, value),
      ),
      spotlight: orDefault(readField(input, 'spotlight'), DEFAULT_THEME.spotlight, checkBoolean),
      font: checkOneOf(FONTS, readField(input, 'font')),
      buttonStyle: checkOneOf(BUTTON_STYLES, readField(input, 'buttonStyle')),
      layout: checkOneOf(LAYOUTS, readField(input, 'layout')),
      mode: checkOneOf(MODES, readField(input, 'mode')),
    }),
  )
}

/** WCAG AA: 4.5:1 for text, 3:1 for the shapes and large labels of buttons, chips and links. */
export const TEXT_CONTRAST_MIN = 4.5
export const ACCENT_CONTRAST_MIN = 3

export const THEME_ISSUES = ['textContrast', 'accentContrast'] as const
/** Why a theme is hard to read. The editor warns about it; it does not refuse the theme. */
export type ThemeIssue = (typeof THEME_ISSUES)[number]

export function themeIssues(theme: Theme): ThemeIssue[] {
  const issues: ThemeIssue[] = []
  if (contrastRatio(theme.secondary, theme.background) < TEXT_CONTRAST_MIN) issues.push('textContrast')
  else if (theme.backdrop === 'picture' && theme.backdropPicture !== null) {
    // The photo's worst grounds, the same ones toCssVars constrains its own tokens against (photoGrounds). The engine
    // re-derives muted text for them; the owner's text color can only be warned about, like on the page.
    const veil = isOneOf(VEILS, theme.backdropVeil) ? theme.backdropVeil : DEFAULT_THEME.backdropVeil
    if (photoGrounds(theme.background, veil).some((ground) => contrastRatio(theme.secondary, ground) < TEXT_CONTRAST_MIN)) issues.push('textContrast')
  }
  if (contrastRatio(theme.primary, theme.background) < ACCENT_CONTRAST_MIN) issues.push('accentContrast')
  return issues
}

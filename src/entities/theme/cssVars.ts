import { isOneOf } from '@/shared/lib/checks'
import { backdropLayers } from './backdrop'
import { contrastRatio, INK, isDarkColor, isHexColor, mixHex, normalizeHex, WHITE } from './color'
import { BACKDROPS, BUTTON_STYLES, DEFAULT_THEME, FONTS, modeDefaults, MODES, type ButtonStyle, type Font, type Theme } from './theme'
import { TEXT_CONTRAST_MIN } from './validate'

// Every value below comes from a fixed map or is a color rebuilt as `#rrggbb`: no text a person typed ever reaches CSS.

type FontStacks = { body: string; display: string; script: string }

// The app's own faces (main.tsx) and the ones the menu loads on demand (src/shared/menu/fonts.ts), each with a safe fallback.
const SANS = 'var(--font-sans)'
const SERIF = 'var(--font-serif)'
const SYSTEM = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
const PLAYFAIR = "'Playfair Display Variable', Georgia, 'Times New Roman', serif"
const DM_SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif"
const ANTON = "Anton, 'Arial Narrow', Impact, sans-serif"
const FREDOKA = "'Fredoka Variable', 'Trebuchet MS', system-ui, sans-serif"
const PACIFICO = "Pacifico, 'Brush Script MT', cursive"

const FONT_STACKS: Record<Font, FontStacks> = {
  urbanist: { body: SANS, display: SANS, script: PACIFICO },
  instrumentSerif: { body: SERIF, display: SERIF, script: PACIFICO },
  system: { body: SYSTEM, display: SYSTEM, script: PACIFICO },
  playfair: { body: SANS, display: PLAYFAIR, script: PACIFICO },
  dmSerif: { body: SANS, display: DM_SERIF, script: PACIFICO },
  anton: { body: SANS, display: ANTON, script: PACIFICO },
  fredoka: { body: SANS, display: FREDOKA, script: PACIFICO },
  pacifico: { body: SANS, display: PACIFICO, script: PACIFICO },
}

const RADII: Record<ButtonStyle, string> = { rounded: '12px', square: '4px', pill: '999px' }

// Lines are the ink on a light surface and white on a dark one, at 12% (alpha 1f), so they stay faint on the page and on cards.
const LINE_ON_LIGHT = '#19202b1f'
const LINE_ON_DARK = '#ffffff1f'
// How far a card is lifted toward white, from the most to the least.
const CARD_LIFTS = [0.06, 0.04, 0.02]
// How much of the way a color moves each time it is nudged to read better.
const NUDGE_STEP = 0.02
const BLACK = '#000000'

function colorOr(value: unknown, fallback: string): string {
  return isHexColor(value) ? normalizeHex(value) : fallback
}

/**
 * The automatic card color. Cards follow the page, not the mode, so they show on any page the owner picks. On a light page a
 * card is white. On any other page it is the page lifted a little toward white, as much as the text still reads on it: the
 * first lift (6%, 4%, 2%) that keeps the text at 4.5:1 wins, and when none does the card is the page itself. So a card never
 * hides its own text, and text that reads on the page (what the Colors panel checks) reads on the card too.
 */
function autoSurfaceOf(darkPage: boolean, background: string, text: string): string {
  if (!darkPage && contrastRatio(text, WHITE) >= TEXT_CONTRAST_MIN) return WHITE
  for (const lift of CARD_LIFTS) {
    const lifted = mixHex(background, WHITE, lift)
    if (lifted !== null && contrastRatio(text, lifted) >= TEXT_CONTRAST_MIN) return lifted
  }
  return background
}

/**
 * Text for something drawn on `ground`: `preferred` when it reads at 4.5:1, else white, ink or black, the first of them that
 * does. On the mid-tones where only black reaches 4.5:1 (a medium blue) that is black.
 */
function textOn(ground: string, preferred: string): string {
  for (const candidate of [preferred, WHITE, INK, BLACK]) {
    if (contrastRatio(candidate, ground) >= TEXT_CONTRAST_MIN) return candidate
  }
  return contrastRatio(WHITE, ground) >= contrastRatio(BLACK, ground) ? WHITE : BLACK
}

/** Text for second-rank lines: `text` moved toward `ground`, but never below 4.5:1 on `ground` or on any of `others`. */
function mutedOf(text: string, ground: string, others: readonly string[] = []): string {
  for (const weight of [0.4, 0.3, 0.2, 0.1]) {
    const muted = mixHex(text, ground, weight) ?? text
    if (contrastRatio(muted, ground) >= TEXT_CONTRAST_MIN && others.every((other) => contrastRatio(muted, other) >= TEXT_CONTRAST_MIN)) return muted
  }
  return text
}

/**
 * The accent as a background behind text, with the text that goes on it. The accent itself when white or ink reads on it at
 * 4.5:1. Otherwise the accent moved the least toward black (white text) or toward white (ink text) until the text does, so a
 * price badge or a label chip keeps the owner's color as close as it can while its words stay readable.
 */
export function fillOf(accent: string): { fill: string; on: string } {
  const on = contrastRatio(accent, WHITE) >= contrastRatio(accent, INK) ? WHITE : INK
  if (contrastRatio(accent, on) >= TEXT_CONTRAST_MIN) return { fill: accent, on }
  const toward = on === WHITE ? BLACK : WHITE
  for (let weight = NUDGE_STEP; weight < 1; weight += NUDGE_STEP) {
    const moved = mixHex(accent, toward, weight)
    if (moved !== null && contrastRatio(moved, on) >= TEXT_CONTRAST_MIN) return { fill: moved, on }
  }
  return { fill: toward, on }
}

/**
 * The custom properties the menu puts on its root, from a validated theme. A value that is somehow not valid falls back
 * to the default, so even a theme that skipped `validateTheme` cannot inject CSS.
 */
export function toCssVars(theme: Theme): Record<string, string> {
  const mode = isOneOf(MODES, theme.mode) ? theme.mode : DEFAULT_THEME.mode
  const defaults = modeDefaults(mode)
  const background = colorOr(theme.background, defaults.background)
  const text = colorOr(theme.secondary, defaults.secondary)
  const accent = colorOr(theme.primary, DEFAULT_THEME.primary)
  const darkPage = isDarkColor(background) === true
  const chosenSurface = isHexColor(theme.surface) ? normalizeHex(theme.surface) : null
  const surface = chosenSurface ?? autoSurfaceOf(darkPage, background, text)
  // On a card the owner colored, the page text may not read (a cream card on a dark page), so the card gets text of its own.
  const onSurface = chosenSurface === null ? text : textOn(surface, text)
  const { fill, on } = fillOf(accent)
  const font = isOneOf(FONTS, theme.font) ? theme.font : DEFAULT_THEME.font
  const stacks = FONT_STACKS[font]
  const buttonStyle = isOneOf(BUTTON_STYLES, theme.buttonStyle) ? theme.buttonStyle : DEFAULT_THEME.buttonStyle
  const backdrop = isOneOf(BACKDROPS, theme.backdrop) ? theme.backdrop : DEFAULT_THEME.backdrop
  const layers = backdropLayers(backdrop, { background, text, accent })
  // The worst grounds a drawn texture can put under the page text: the page moved toward the ink or the accent by the
  // texture's declared ceiling. Muted text must read there too (for the classic five both are the page itself).
  const inkGround = mixHex(background, text, layers.inkShare) ?? background
  const accentGround = mixHex(background, accent, layers.accentShare) ?? background
  const vars: Record<string, string> = {
    '--menu-bg': background,
    '--menu-text': text,
    '--menu-accent': accent,
    '--menu-surface': surface,
    '--menu-on-surface': onSurface,
    '--menu-line': darkPage ? LINE_ON_DARK : LINE_ON_LIGHT,
    '--menu-card-line': isDarkColor(surface) === true ? LINE_ON_DARK : LINE_ON_LIGHT,
    '--menu-muted': mutedOf(text, background, [chosenSurface === null ? surface : background, inkGround, accentGround]),
    '--menu-card-muted': mutedOf(onSurface, surface),
    '--menu-fill': fill,
    '--menu-on-fill': on,
    '--menu-font': stacks.body,
    '--menu-display': stacks.display,
    '--menu-script': stacks.script,
    '--menu-radius': RADII[buttonStyle],
  }
  // Only the drawn textures travel as a variable; the classic five are painted by the menu's own CSS.
  if (layers.image !== null) vars['--menu-backdrop-image'] = layers.image
  return vars
}

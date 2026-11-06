import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Business } from '@/entities/business/business'
import { isDarkColor } from '@/entities/theme/color'
import type { StockId } from '@/entities/theme/stockPhotos'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { GALLERY_STYLE_IDS, MODES, STYLE_IDS, withMode, type Mode, type ModeColors, type StyleId, type Theme } from '@/entities/theme/theme'
import { mergePresets } from '@/presets'
import { isOneOf } from '@/shared/lib/checks'
import { fill } from '@/shared/lib/fill'
import { styleName } from './styleWords'
import { sameSurface, sameTheme, type ColorKey, type Draft, type ThemeChoiceKey } from './draft'
import type { FieldKey } from './validateDraft'

const words = dashboardCopy.design.look

/** The pair of page and text colors the owner is leaving, kept by kind so the other tap on Light or dark can bring it back. */
type Remembered = { light?: ModeColors; dark?: ModeColors }

/** The choices the owner sets one by one. The style and the mode have their own actions. */
export type ChoiceKey = Exclude<ThemeChoiceKey, 'style' | 'mode'>

type Palette = Pick<Theme, 'primary' | 'secondary' | 'background' | 'surface'>

// A whole new look replaces every color, so the errors of every color go with it.
const LOOK_COLORS: readonly FieldKey[] = ['primary', 'secondary', 'background', 'surface']

/** The style a theme started from, or Classic for a value that is somehow not on the list. */
export function styleOf(theme: Theme): StyleId {
  return isOneOf(STYLE_IDS, theme.style) ? theme.style : 'classic'
}

/** The look a menu is drawn in, for the panel to name: a retired style is drawn as Daybreak (`plainTheme`), so it is Daybreak here too. */
export function shownStyleOf(theme: Theme): StyleId {
  const id = styleOf(theme)
  return (GALLERY_STYLE_IDS as readonly StyleId[]).includes(id) ? id : 'daybreak'
}

/**
 * `next` with the owner's page photo as it is in `from`: the picture, the library photo, whether the page shows one, their
 * strength, their fit and their position. The photo is the owner's, not a choice of a style, so it stays on the page while they try
 * styles and go back to one.
 */
function withOwnerPhoto(next: Theme, from: Theme): Theme {
  const { backdrop, backdropPicture, backdropStock, backdropVeil, backdropFit, backdropPosition } = from
  const shows = backdrop === 'picture' || backdrop === 'stock'
  return { ...next, backdrop: shows ? backdrop : next.backdrop, backdropPicture, backdropStock, backdropVeil, backdropFit, backdropPosition }
}

function samePalette(theme: Theme, palette: Palette): boolean {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  return (
    same(theme.primary, palette.primary) &&
    same(theme.secondary, palette.secondary) &&
    same(theme.background, palette.background) &&
    sameSurface(theme.surface, palette.surface)
  )
}

/**
 * The theme in `mode`. Colors the owner has not touched since picking a style (they are still one of the style's palettes)
 * take the style's palette for the new mode, so the look stays itself. Edited colors move as `withMode` says.
 */
export function switchedTheme(theme: Theme, mode: Mode, remembered?: ModeColors): Theme {
  const { palettes } = STYLES[styleOf(theme)]
  if (MODES.some((from) => samePalette(theme, palettes[from]))) return { ...theme, ...palettes[mode], mode }
  return withMode(theme, mode, remembered)
}

type Context = {
  draft: Draft
  business: Business
  busy: boolean
  theme: (update: (current: Theme) => Theme, cleared?: readonly FieldKey[]) => void
  setNote: (note: string) => void
}

/**
 * Everything the Look tab changes in the draft. It remembers the owner's own page and text colors of the mode being left,
 * so the other tap on Light or dark brings them back; `forget` drops them (Discard, a new look).
 */
export function useLookActions({ draft, business, busy, theme, setNote }: Context) {
  const remembered = useRef<Remembered>({})
  const forget = () => {
    remembered.current = {}
  }

  /** A whole new look in the draft, with a note that says so. Nothing happens while a save runs, so no note either. */
  const replace = (next: Theme, note: string) => {
    if (busy) return
    forget()
    theme(() => next, LOOK_COLORS)
    setNote(note)
  }

  const savedOr = (next: Theme, changed: string, same: string) => (sameTheme(next, business.theme) ? same : changed)

  return {
    forget,
    setColor: (key: ColorKey, value: string) => theme((current) => ({ ...current, [key]: value }), [key]),
    /** A card color, or null for the automatic one. */
    setSurface: (surface: string | null) => theme((current) => ({ ...current, surface }), ['surface']),
    setChoice: <Key extends ChoiceKey>(key: Key, value: Theme[Key]) => theme((current) => ({ ...current, [key]: value })),
    /** A photo of the library as the page background, in one update; its strength, fit and position stay as they are. */
    chooseStock: (id: StockId) => theme((current) => ({ ...current, backdrop: 'stock', backdropStock: id })),
    /** Takes the library photo off the page: no photo, and the page goes back to the texture of the style the look started from. */
    clearStock: () =>
      theme((current) => ({ ...current, backdrop: styleTheme(styleOf(current), current.mode).backdrop, backdropStock: null })),
    /** Light or dark: the pair of colors being left is kept, so the next tap brings the owner's own colors back. */
    setMode: (mode: Mode) => {
      const { background, secondary } = draft.theme
      const leaving = isDarkColor(background)
      if (leaving !== null) remembered.current[leaving ? 'dark' : 'light'] = { background, secondary }
      const pair = remembered.current[mode]
      theme((current) => switchedTheme(current, mode, pair), LOOK_COLORS)
    },
    /**
     * The whole look of a style, in the mode the draft is in. The page photo (uploaded, or from the library) is an asset, not
     * a choice: it survives trying styles.
     */
    applyStyle: (id: StyleId) =>
      replace(withOwnerPhoto(styleTheme(id, draft.theme.mode), draft.theme), fill(words.styles.applied, { style: styleName(id) })),
    /** Back to the style the look started from, every choice and color — the page photo stays, like on applyStyle. */
    resetStyle: () => {
      const id = shownStyleOf(draft.theme)
      const next = withOwnerPhoto(styleTheme(id, draft.theme.mode), draft.theme)
      const style = styleName(id)
      replace(next, fill(savedOr(next, words.styles.resetStyleNote, words.styles.resetStyleNoteSame), { style }))
    },
    /** Back to the look of the business type (the preset). */
    resetLook: () => {
      const preset = mergePresets(business.types).theme
      replace(preset, savedOr(preset, words.resetNote, words.resetNoteSame))
    },
  }
}

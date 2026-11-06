import type { BusinessType } from '@/entities/business/business'
import type { Mode, StyleId, Theme } from './theme'

/** The colors a style has in one mode. `surface` null is the automatic card color. */
export type Palette = Pick<Theme, 'primary' | 'secondary' | 'background' | 'surface'>

/** Everything a style sets besides colors and the mode: how the menu is drawn. The page photo and how it is laid are the owner's. */
export type Choices = Omit<
  Theme,
  keyof Palette | 'mode' | 'style' | 'backdropPicture' | 'backdropStock' | 'backdropVeil' | 'backdropFit' | 'backdropPosition'
>

export type StyleDef = {
  id: StyleId
  /** The kinds of business it suits. The picker says so in words (the design copy). */
  bestFor: readonly BusinessType[]
  /** The mode its look was made for. The other mode has a palette of the same family. */
  native: Mode
  choices: Choices
  palettes: Record<Mode, Palette>
}

/**
 * What a page template sets of the older per-part choices: Classic's, because a template draws its own cards, header, titles and
 * line art and reads none of them. A template chooses only its font and its menu layout.
 */
export const TEMPLATE_CHOICES = {
  card: 'row',
  photo: 'rounded',
  title: 'plain',
  header: 'plain',
  decor: 'none',
  backdrop: 'plain',
  spotlight: false,
  buttonStyle: 'rounded',
} as const satisfies Partial<Choices>

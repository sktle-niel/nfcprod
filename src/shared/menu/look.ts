import { createContext, useContext } from 'react'
import { isOneOf } from '@/shared/lib/checks'
import {
  BACKDROPS,
  CARDS,
  DECORS,
  DEFAULT_THEME,
  HEADERS,
  LAYOUTS,
  PHOTO_FITS,
  PHOTO_POSITIONS,
  PHOTOS,
  TITLES,
  type Theme,
} from '@/entities/theme/theme'

/** What the renderer reads from a theme to decide how the menu is drawn (the colors and fonts travel as CSS variables). */
export type Look = Pick<
  Theme,
  'card' | 'photo' | 'title' | 'header' | 'decor' | 'backdrop' | 'backdropFit' | 'backdropPosition' | 'spotlight' | 'layout'
>

/**
 * The look of a theme. A value that is somehow not on its list falls back to the default, like `toCssVars` does, so even a
 * theme that skipped `validateTheme` only ever picks one of our own components.
 */
export function lookOf(theme: Theme): Look {
  return {
    card: isOneOf(CARDS, theme.card) ? theme.card : DEFAULT_THEME.card,
    photo: isOneOf(PHOTOS, theme.photo) ? theme.photo : DEFAULT_THEME.photo,
    title: isOneOf(TITLES, theme.title) ? theme.title : DEFAULT_THEME.title,
    header: isOneOf(HEADERS, theme.header) ? theme.header : DEFAULT_THEME.header,
    decor: isOneOf(DECORS, theme.decor) ? theme.decor : DEFAULT_THEME.decor,
    backdrop: isOneOf(BACKDROPS, theme.backdrop) ? theme.backdrop : DEFAULT_THEME.backdrop,
    backdropFit: isOneOf(PHOTO_FITS, theme.backdropFit) ? theme.backdropFit : DEFAULT_THEME.backdropFit,
    backdropPosition: isOneOf(PHOTO_POSITIONS, theme.backdropPosition) ? theme.backdropPosition : DEFAULT_THEME.backdropPosition,
    spotlight: theme.spotlight === true,
    layout: isOneOf(LAYOUTS, theme.layout) ? theme.layout : DEFAULT_THEME.layout,
  }
}

const LookContext = createContext<Look>(lookOf(DEFAULT_THEME))

/** Gives every part of one menu its look, so a part does not need the theme passed down. */
export const LookProvider = LookContext.Provider

/** The look of the menu this part is drawn in. Outside a menu it is the Classic look. */
export function useLook(): Look {
  return useContext(LookContext)
}

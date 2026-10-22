import { useEffect } from 'react'
import type { Font, Theme } from '@/entities/theme/theme'

/**
 * Fonts the menu loads on demand. Urbanist and Instrument Serif are part of the app (main.tsx) and the system stack needs no
 * file, so only these five are lazy. Each loader is a dynamic import of a stylesheet from an installed @fontsource package:
 * the bundler turns it into its own small chunk, so nothing here weighs on the landing page or on the public menu chunk.
 * The static packages offer a latin-only sheet. The two variable packages have no such sheet, but their @font-face rules carry
 * a unicode-range, so the browser fetches the latin file only (and the others only when a character needs them).
 */
export type MenuFace = 'playfair' | 'dmSerif' | 'anton' | 'fredoka' | 'pacifico'

export const FACE_LOADERS: Readonly<Record<MenuFace, () => Promise<unknown>>> = {
  playfair: () => import('@fontsource-variable/playfair-display/wght.css'),
  dmSerif: () => import('@fontsource/dm-serif-display/latin-400.css'),
  anton: () => import('@fontsource/anton/latin-400.css'),
  fredoka: () => import('@fontsource-variable/fredoka/wght.css'),
  pacifico: () => import('@fontsource/pacifico/latin-400.css'),
}

/** The lazy faces of each pairing (its display face; the body face is Urbanist or the system stack). */
export const PAIRING_FACES: Readonly<Record<Font, readonly MenuFace[]>> = {
  urbanist: [],
  instrumentSerif: [],
  system: [],
  playfair: ['playfair'],
  dmSerif: ['dmSerif'],
  anton: ['anton'],
  fredoka: ['fredoka'],
  pacifico: ['pacifico'],
}

type FontLook = Pick<Theme, 'font' | 'title' | 'header'>

/** The faces a theme needs: its pairing's, plus the script face when a title or the header is drawn in script. */
export function facesOf(theme: FontLook): MenuFace[] {
  const faces = new Set<MenuFace>(PAIRING_FACES[theme.font] ?? [])
  if (theme.title === 'script' || theme.header === 'script') faces.add('pacifico')
  return [...faces]
}

// One request per face for the life of the page. A failed load is forgotten, so the next menu that needs it tries again.
const started = new Map<MenuFace, Promise<void>>()

function loadFace(face: MenuFace): Promise<void> {
  const known = started.get(face)
  if (known) return known
  // A font that does not load changes nothing but the letter shapes: the stacks have fallbacks, so the error stops here.
  const attempt = Promise.resolve()
    .then(FACE_LOADERS[face])
    .then(
      () => undefined,
      () => {
        started.delete(face)
      },
    )
  started.set(face, attempt)
  return attempt
}

/** Test hook: forget what was loaded. */
export function resetLoadedFaces(): void {
  started.clear()
}

/**
 * Loads the font files a menu needs, once, when it is first drawn: only the faces of the pairing the theme uses (and the
 * script face when a title or header asks for it). Nothing is requested for a font that no menu on the page uses, so the
 * public menu stays light. The stylesheets use font-display: swap, so text shows at once in the fallback and then switches.
 */
export function useMenuFonts(theme: FontLook): void {
  const key = facesOf(theme).join(',')
  useEffect(() => {
    for (const face of key === '' ? [] : (key.split(',') as MenuFace[])) void loadFace(face)
  }, [key])
}

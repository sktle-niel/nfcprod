import { useEffect } from 'react'
import { FONTS, isTemplateStyle, type Font, type TemplateStyleId, type Theme } from '@/entities/theme/theme'
import { isOneOf } from '@/shared/lib/checks'

/**
 * Fonts the menu loads on demand. Urbanist and Instrument Serif are part of the app (main.tsx) and the system stack needs no
 * file, so only these five are lazy. Each loader is a dynamic import of a stylesheet from an installed @fontsource package:
 * the bundler turns it into its own small chunk, so nothing here weighs on the landing page or on the public menu chunk.
 * The static packages offer a latin-only sheet. The two variable packages have no such sheet, but their @font-face rules carry
 * a unicode-range, so the browser fetches the latin file only (and the others only when a character needs them).
 */
export type MenuFace = 'playfair' | 'dmSerif' | 'anton' | 'fredoka' | 'pacifico' | 'inter' | 'poppins' | 'mulish' | 'sourceSerif' | 'dancing'

export const FACE_LOADERS: Readonly<Record<MenuFace, () => Promise<unknown>>> = {
  playfair: () => import('@fontsource-variable/playfair-display/wght.css'),
  dmSerif: () => import('@fontsource/dm-serif-display/latin-400.css'),
  anton: () => import('@fontsource/anton/latin-400.css'),
  fredoka: () => import('@fontsource-variable/fredoka/wght.css'),
  pacifico: () => import('@fontsource/pacifico/latin-400.css'),
  // Upright and italic: Daybreak's headline slants its last words.
  inter: () => Promise.all([import('@fontsource-variable/inter/wght.css'), import('@fontsource-variable/inter/wght-italic.css')]),
  // Static files: the weights the templates use (regular, medium, semibold, bold), latin only.
  poppins: () =>
    Promise.all([
      import('@fontsource/poppins/latin-400.css'),
      import('@fontsource/poppins/latin-500.css'),
      import('@fontsource/poppins/latin-600.css'),
      import('@fontsource/poppins/latin-700.css'),
    ]),
  mulish: () => import('@fontsource-variable/mulish/wght.css'),
  sourceSerif: () => import('@fontsource-variable/source-serif-4/wght.css'),
  dancing: () => import('@fontsource-variable/dancing-script/wght.css'),
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
  inter: ['inter'],
  poppins: ['poppins'],
  mulish: ['mulish'],
  sourceSerif: ['sourceSerif', 'inter'],
}

/** The faces a page template draws with whatever pairing the owner picked: Drip's thin script title. */
export const TEMPLATE_FACES: Readonly<Partial<Record<TemplateStyleId, readonly MenuFace[]>>> = {
  drip: ['dancing'],
  marmalade: ['pacifico'],
}

type FontLook = Pick<Theme, 'font' | 'title' | 'header'> & { style?: Theme['style'] | undefined }

/** The faces a theme needs: its pairing's, plus the script face when a title or the header is drawn in script, plus its template's own. */
export function facesOf(theme: FontLook): MenuFace[] {
  // A value that is somehow not on its list needs no face and is never used as a key: '__proto__' would find the table's prototype.
  const faces = new Set<MenuFace>(isOneOf(FONTS, theme.font) ? PAIRING_FACES[theme.font] : [])
  if (theme.title === 'script' || theme.header === 'script') faces.add('pacifico')
  if (isTemplateStyle(theme.style)) for (const face of TEMPLATE_FACES[theme.style] ?? []) faces.add(face)
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

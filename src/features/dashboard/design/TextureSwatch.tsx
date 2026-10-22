import { useMemo, type CSSProperties } from 'react'
import { BACKDROP_TILES, backdropLayers, type NewBackdropKind } from '@/entities/theme/backdrop'
import { isHexColor, normalizeHex } from '@/entities/theme/color'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import styles from './Glyph.module.css'

/**
 * How the swatch box frames a tile much larger than itself: a crop (background-position) aimed at a telling part of the
 * drawing — marble's forking veins, a terrazzo cluster with an accent chip, a ring nest of the contours — instead of a
 * bare corner. Swatch-only numbers of our own, like the glyph tables, never owner text.
 */
const FRAME: Partial<Record<NewBackdropKind, string>> = {
  marble: '-150px -95px',
  terrazzo: '-75px -2px',
  topo: '-285px -205px',
}

/** The tile drawn at the menu's own scale; `full` shrinks the whole page onto the box, `auto` keeps the gradient's period. */
const sizeOf = (kind: NewBackdropKind): string => {
  const tile = BACKDROP_TILES[kind]
  if (tile === 'full') return '100% 100%'
  if (tile === 'auto') return 'auto'
  return `${tile.width}px ${tile.height}px`
}

/**
 * A swatch of one drawn page texture: the real image from `backdropLayers` over the draft's own page color, so the picker
 * never lies about the page. It is decoration — the option's label names the choice — so it is hidden from screen readers
 * and takes no focus. The style holds only our own strings: `backdropLayers` re-checks every color it embeds, and the page
 * color is re-checked here the same way before it becomes a style value.
 */
export function TextureSwatch({ kind, theme }: { kind: NewBackdropKind; theme: Theme }) {
  const { background, secondary, primary } = theme
  const style = useMemo(() => {
    const page = isHexColor(background) ? normalizeHex(background) : DEFAULT_THEME.background
    const { image } = backdropLayers(kind, { background: page, text: secondary, accent: primary })
    return {
      '--swatch-page': page,
      '--swatch-image': image ?? 'none',
      '--swatch-size': sizeOf(kind),
      ...(BACKDROP_TILES[kind] === 'full' ? { '--swatch-repeat': 'no-repeat' } : {}),
      ...(kind in FRAME ? { '--swatch-at': FRAME[kind] } : {}),
    } as CSSProperties
  }, [kind, background, secondary, primary])
  return <span className={`${styles.texture} ${styles.drawn}`} data-texture={kind} style={style} aria-hidden="true" />
}

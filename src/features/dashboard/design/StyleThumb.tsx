import { memo, useMemo, useRef, type CSSProperties } from 'react'
import type { Menu } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import type { Mode, StyleId } from '@/entities/theme/theme'
import { MenuView } from '@/shared/menu/MenuView'
import type { ThumbBusiness } from './thumbs'
import { useFitScale, useSeen } from './useThumbView'
import styles from './StyleGallery.module.css'

/** The width the thumbnail's menu is laid out at, like a phone, before it is shrunk to the box. */
const PAGE_WIDTH = 360
/** The shrink used until the box is measured: about a two-column card on a phone. */
const FALLBACK_SCALE = 0.4

type Props = { id: StyleId; mode: Mode; business: ThumbBusiness; menu: Menu }

/**
 * The owner's own menu drawn small in one style: the real renderer, so the picture never lies about the look. It is only a
 * picture: hidden from screen readers (the radio's label names the style), inert (no focus, no clicks), and drawn only once
 * it comes near the screen, so thirteen menus do not weigh on the page. Memoised: typing a color does not redraw it.
 */
export const StyleThumb = memo(function StyleThumb({ id, mode, business, menu }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const seen = useSeen(box)
  const scale = useFitScale(box, PAGE_WIDTH, FALLBACK_SCALE)
  const shown = useMemo(() => ({ ...business, theme: styleTheme(id, mode) }), [business, id, mode])

  return (
    <div ref={box} className={styles.thumb} aria-hidden="true" inert data-style-thumb={id}>
      {seen && (
        <div className={styles.page} style={{ '--thumb-scale': scale } as CSSProperties}>
          <MenuView business={shown} menu={menu} headingLevel={2} interactive={false} />
        </div>
      )}
    </div>
  )
})

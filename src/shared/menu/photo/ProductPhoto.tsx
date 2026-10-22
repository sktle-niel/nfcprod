import { useLook } from '../look'
import { Illustration } from './Illustration'
import type { PlaceholderKind } from './placeholders'
import { usePictureOpacity } from './usePictureOpacity'
import styles from './ProductPhoto.module.css'

type Props = {
  /** The picture, already checked by `pictureSrc`, or null for the placeholder. */
  src: string | null
  placeholder: PlaceholderKind
  /**
   * The card's own class: the width (and, for the framed shapes, `--photo-ratio`). The look gives the rest: the shape, the
   * fit, the shadow of a cut-out.
   */
  className?: string | undefined
}

/**
 * The picture of a product in the shape the menu's look asks for. Without a picture it draws a flat illustration of the
 * kind in the same shape, so a card never has a hole where the picture goes. Both are decoration next to the name, so they
 * have no text of their own. The shape is also on the element as `data-shape`, for a card that places each shape its own way.
 */
export function ProductPhoto({ src, placeholder, className }: Props) {
  const { photo } = useLook()
  // Cut-out suits only a picture with see-through parts: an opaque photo there floats over the card as a hard rectangle,
  // so its pixels decide (usePictureOpacity) and an opaque one is framed with rounded corners instead. The placeholder
  // drawings all have see-through parts, so they keep whatever shape the look asked for.
  const opacity = usePictureOpacity(photo === 'cutout' ? src : null)
  const shape = photo === 'cutout' && src !== null && opacity === 'opaque' ? 'rounded' : photo
  const classes = [styles.photo, styles[shape], className].filter(Boolean).join(' ')
  if (src !== null) return <img className={classes} data-shape={shape} src={src} alt="" loading="lazy" decoding="async" />
  return (
    <span className={`${classes} ${styles.empty}`} data-shape={shape} aria-hidden="true">
      <span className={styles.drawing}>
        <Illustration kind={placeholder} />
      </span>
    </span>
  )
}

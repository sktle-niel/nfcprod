import { useLook } from '../look'
import { Illustration } from './Illustration'
import type { PlaceholderKind } from './placeholders'
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
  const classes = [styles.photo, styles[photo], className].filter(Boolean).join(' ')
  if (src !== null) return <img className={classes} data-shape={photo} src={src} alt="" loading="lazy" decoding="async" />
  return (
    <span className={`${classes} ${styles.empty}`} data-shape={photo} aria-hidden="true">
      <span className={styles.drawing}>
        <Illustration kind={placeholder} />
      </span>
    </span>
  )
}

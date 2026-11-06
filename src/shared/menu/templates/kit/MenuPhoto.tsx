import { Illustration } from '../../photo/Illustration'
import type { PlaceholderKind } from '../../photo/placeholders'

type Props = {
  /** The picture, already checked by `pictureSrc`, or null for the drawn illustration of `placeholder`. */
  src: string | null
  placeholder: PlaceholderKind
  /** The box: a template gives it its size and shape (a circle, a squircle, a full-bleed top). */
  className?: string | undefined
  imageClassName?: string | undefined
  /** True for a picture above the fold, which should not wait to scroll into view. */
  eager?: boolean | undefined
}

/**
 * A product picture for a template: the owner's photo, covering its box, or the drawn illustration of the item when it has none.
 * The picture is decoration (the name sits next to it), so it has no alt text. Pictures below the fold load as they near the screen.
 */
export function MenuPhoto({ src, placeholder, className, imageClassName, eager = false }: Props) {
  return (
    <span className={className} data-placeholder={src === null ? '' : undefined}>
      {src === null ? (
        <Illustration kind={placeholder} />
      ) : (
        <img className={imageClassName} src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
      )}
    </span>
  )
}

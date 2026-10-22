import type { Product } from '@/entities/menu/menu'
import type { PlaceholderKind } from '../photo/placeholders'

/** What every kind of card is given for one product. */
export type CardProps = {
  product: Product
  /** The heading tag of the product name, one level under its category. */
  as: 'h3' | 'h4'
  /** True when at least one of the product's add-on groups exists on the menu. */
  hasAddOns: boolean
  /** The picture to draw, already checked by `pictureSrc`, or null (the card then draws the placeholder). */
  photo: string | null
  /** The illustration for a product without a picture. */
  placeholder: PlaceholderKind
  /** The place of the product in its category, counted from 1, for the kinds that number their items. */
  number: number
}

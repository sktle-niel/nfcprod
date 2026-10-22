import type { Product } from '@/entities/menu/menu'

/** The attribute a card puts on its root when its product is sold out, so its stylesheet can strike the price and quiet the photo. */
export const soldOutAttr = (product: Product): '' | undefined => (product.available ? undefined : '')

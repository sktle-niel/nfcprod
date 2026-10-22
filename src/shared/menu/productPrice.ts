import type { Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'

/** The price line of a product: the price, or "From {lowest}" when it has sizes or options. */
export function priceText(product: Product, fromTemplate: string): string {
  if (product.variants.length === 0) return formatPeso(product.price)
  // The lowest variant is read again here: the stored price is only trusted when there are no variants.
  const lowest = Math.min(...product.variants.map((variant) => variant.price))
  return fromTemplate.replace('{price}', formatPeso(lowest))
}

/** "S ₱120 · M ₱140", or an empty string when the product has no variants. */
export function variantsText(product: Product): string {
  return product.variants.map((variant) => `${variant.label}\u00a0${formatPeso(variant.price)}`).join(' · ')
}

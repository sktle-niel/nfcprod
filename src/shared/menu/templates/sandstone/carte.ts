import type { Product } from '@/entities/menu/menu'

/**
 * The one item of a category that gets a plate: its first best seller with a picture, or else its first item with a picture. A
 * sold-out item is not shown off. Null leaves the category as pure type, which is how most of a carte reads anyway.
 */
export function plateOf(products: readonly Product[], photoOf: (product: Product) => string | null): Product | null {
  const pictured = products.filter((product) => product.available && photoOf(product) !== null)
  return pictured.find((product) => product.tags.includes('bestSeller')) ?? pictured[0] ?? null
}

/** The items in the order of the two columns: the plate cannot sit in a column, so it heads the category across both. */
export function plateFirst(products: readonly Product[], plate: Product | null): Product[] {
  return plate === null ? [...products] : [plate, ...products.filter((product) => product !== plate)]
}

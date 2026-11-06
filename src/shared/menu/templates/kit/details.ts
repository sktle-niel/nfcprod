import { copy } from '@/config/copy'
import type { ModifierGroup, ModifierOption, Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'

/** Whether a product has anything for `ProductDetails` to show: the templates use it to decide whether a card can open. */
export function hasDetails(product: Product, groups: ModifierGroup[]): boolean {
  return product.variants.length > 0 || product.groupIds.some((id) => groups.some((group) => group.id === id))
}

/**
 * What a choice of a group adds to the price: "+₱30", or "Free" beside choices that cost something. A group where nothing costs extra
 * (sugar level, ice) says nothing at all: "25% Free" would read like a discount.
 */
export function optionExtra(option: ModifierOption, group: ModifierGroup): string {
  if (option.price > 0) return `+${formatPeso(option.price)}`
  return group.options.some(({ price }) => price > 0) ? copy.menu.view.template.free : ''
}

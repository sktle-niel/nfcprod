import type { ModifierGroup, Product } from '@/entities/menu/menu'

/** The add-on groups of a product that have something to show: an id that is not on the menu or a group left empty offers nothing. */
export const groupsOf = (product: Product, groups: readonly ModifierGroup[]): ModifierGroup[] =>
  groups.filter(({ id, options }) => options.length > 0 && product.groupIds.includes(id))

/**
 * The add-on groups every item of a category has: a printed list says those once, under the category, and saves a line on every
 * item. One item is no category-wide offer: its add-ons stay on its row.
 */
export function sharedGroups(products: readonly Product[], groups: readonly ModifierGroup[]): ModifierGroup[] {
  const [first, ...rest] = products
  if (first === undefined || rest.length === 0) return []
  return groupsOf(first, groups).filter(({ id }) => rest.every((product) => product.groupIds.includes(id)))
}

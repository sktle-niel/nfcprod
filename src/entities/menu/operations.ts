import type { Menu, Product } from './menu'

// Pure changes to a menu. Each gives back a new menu and leaves the old one as it was. An unknown id, or a move past
// either end, gives back the same menu.

type Delta = -1 | 1

/** `list` with the items at `a` and `b` swapped, or null when either is not there. */
function swap<T>(list: readonly T[], a: number, b: number): T[] | null {
  const first = list[a]
  const second = list[b]
  if (a < 0 || b < 0 || first === undefined || second === undefined) return null
  const next = [...list]
  next[a] = second
  next[b] = first
  return next
}

function moveIn<T extends { id: string }>(list: readonly T[], id: string, delta: Delta): T[] | null {
  if (delta !== -1 && delta !== 1) return null
  const from = list.findIndex((item) => item.id === id)
  return from < 0 ? null : swap(list, from, from + delta)
}

/** Moves a category one place up (-1) or down (1). */
export function moveCategory(menu: Menu, id: string, delta: Delta): Menu {
  const categories = moveIn(menu.categories, id, delta)
  return categories ? { ...menu, categories } : menu
}

/** Moves an add-on group one place up (-1) or down (1). */
export function moveGroup(menu: Menu, id: string, delta: Delta): Menu {
  const groups = moveIn(menu.groups, id, delta)
  return groups ? { ...menu, groups } : menu
}

/** Moves a product one place up or down among the products of its own category. */
export function moveProduct(menu: Menu, id: string, delta: Delta): Menu {
  const { products } = menu
  const from = products.findIndex((product) => product.id === id)
  const product = products[from]
  if (product === undefined || (delta !== -1 && delta !== 1)) return menu
  let to = from + delta
  while (to >= 0 && to < products.length && products[to]?.categoryId !== product.categoryId) to += delta
  const next = swap(products, from, to)
  return next ? { ...menu, products: next } : menu
}

/** Deletes a category and the products in it. */
export function removeCategory(menu: Menu, id: string): Menu {
  if (!menu.categories.some((category) => category.id === id)) return menu
  return {
    ...menu,
    categories: menu.categories.filter((category) => category.id !== id),
    products: menu.products.filter((product) => product.categoryId !== id),
  }
}

/** Deletes an add-on group and takes it off every product that offered it. */
export function removeGroup(menu: Menu, id: string): Menu {
  if (!menu.groups.some((group) => group.id === id)) return menu
  return {
    ...menu,
    groups: menu.groups.filter((group) => group.id !== id),
    products: menu.products.map((product) =>
      product.groupIds.includes(id) ? { ...product, groupIds: product.groupIds.filter((groupId) => groupId !== id) } : product,
    ),
  }
}

/** The products of one category, in menu order. */
export function productsOf(menu: Menu, categoryId: string): Product[] {
  return menu.products.filter((product) => product.categoryId === categoryId)
}

export function hasVariants(product: { variants: readonly unknown[] }): boolean {
  return product.variants.length > 0
}

/** What the menu shows as the price: the lowest variant price when there are variants ("from"), else the price. */
export function lowestPrice(product: { price: number; variants: readonly { price: number }[] }): number {
  return product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.price)) : product.price
}

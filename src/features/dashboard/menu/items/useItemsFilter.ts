import { useMemo } from 'react'
import type { Category, Menu, Product } from '@/entities/menu/menu'
import { productsOf } from '@/entities/menu/operations'
import { matchKey } from '@/shared/lib/checks'

export type Section = {
  category: Category
  products: Product[]
  total: number
}

export type ItemsView = {
  sections: Section[]
  /** Products that match the search (all of them without a search). */
  matches: number
  total: number
  searching: boolean
}

/** The categories with the items that match `query` by name. While searching, a category with no match is left out. */
export function filterMenu(menu: Menu, query: string): ItemsView {
  const key = matchKey(query)
  const searching = key !== ''
  const sections: Section[] = []
  let matches = 0
  for (const category of menu.categories) {
    const all = productsOf(menu, category.id)
    const products = searching ? all.filter((product) => matchKey(product.name).includes(key)) : all
    matches += products.length
    if (!searching || products.length > 0) sections.push({ category, products, total: all.length })
  }
  return { sections, matches, total: menu.products.length, searching }
}

export function useItemsFilter(menu: Menu, query: string): ItemsView {
  return useMemo(() => filterMenu(menu, query), [menu, query])
}

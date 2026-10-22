import type { Category, Menu, Product } from '@/entities/menu/menu'

export type Section = { category: Category; products: Product[] }

/**
 * What the customer sees: the visible categories that have at least one product, in menu order, each with its products
 * in menu order. A product whose category is missing is left out: there is nowhere to show it.
 */
export function visibleSections(menu: Menu): Section[] {
  const byCategory = new Map<string, Product[]>()
  for (const product of menu.products) {
    const list = byCategory.get(product.categoryId)
    if (list) list.push(product)
    else byCategory.set(product.categoryId, [product])
  }
  const sections: Section[] = []
  for (const category of menu.categories) {
    const products = byCategory.get(category.id)
    if (category.visible && products && products.length > 0) sections.push({ category, products })
  }
  return sections
}

/** The product the spotlight shows: the first one with the "Best seller" tag among the visible sections, in menu order. */
export function spotlightOf(sections: Section[]): { product: Product; category: Category } | null {
  for (const { category, products } of sections) {
    const product = products.find((candidate) => candidate.available && candidate.tags.includes('bestSeller'))
    if (product) return { product, category }
  }
  return null
}

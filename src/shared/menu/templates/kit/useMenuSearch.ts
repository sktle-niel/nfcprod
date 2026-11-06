import { useMemo, useState } from 'react'
import type { Section } from '../../sections'

/** Lower case, without accents, trimmed: "Café" is found by "cafe". */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

type MenuSearch = {
  query: string
  setQuery: (query: string) => void
  /** The sections with only the products that match, and no section left empty. All of them while the query is empty. */
  shown: Section[]
  /** How many products match. */
  count: number
  /** True while there is something typed. */
  searching: boolean
}

/** A search over the product names and descriptions of the menu, for the templates that show a search box. Nothing is sent anywhere. */
export function useMenuSearch(sections: Section[]): MenuSearch {
  const [query, setQuery] = useState('')
  const needle = plain(query)
  const shown = useMemo(() => {
    if (needle === '') return sections
    return sections
      .map(({ category, products }) => ({
        category,
        products: products.filter((product) => plain(`${product.name} ${product.description}`).includes(needle)),
      }))
      .filter((section) => section.products.length > 0)
  }, [sections, needle])
  const count = shown.reduce((total, section) => total + section.products.length, 0)
  return { query, setQuery, shown, count, searching: needle !== '' }
}

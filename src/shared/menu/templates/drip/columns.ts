import type { Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'

/** More columns than this leave a phone no room for the name. */
const MOST_COLUMNS = 3
/** A longer size name is no column head: it would push the prices apart. */
const LONGEST_LABEL = 7
/** Past this many characters of prices in a row, the name would be squeezed to a few letters at 320 px. */
const MOST_CHARS = 18
/** A column head is set smaller than the prices: one of its letters takes about this share of a price character. */
const LABEL_SHARE = 0.75

/** What a section prints: its size columns (empty for a plain list) and how many characters of price wide each one is. */
export type Columns = { labels: string[]; chars: number }

export const NO_COLUMNS: Columns = { labels: [], chars: 0 }

/** The size names of a product, or null when they cannot stand as column heads (a blank, too long or repeated name). */
function labelsOf({ variants }: Product): string[] | null {
  const labels = variants.map(({ label }) => label.trim())
  const fits = labels.every((label) => label !== '' && label.length <= LONGEST_LABEL) && new Set(labels).size === labels.length
  return fits ? labels : null
}

const priceTexts = (product: Product) => (product.variants.length === 0 ? [formatPeso(product.price)] : product.variants.map(({ price }) => formatPeso(price)))

/**
 * The size columns of a category, as a printed price list has them: S, M and L over the prices. The product with the most sizes sets
 * their order, so a shorter list cannot put L before S. A category whose sizes do not fit prints them in words under each name instead.
 */
export function columnsOf(products: readonly Product[]): Columns {
  const sized = products.filter(({ variants }) => variants.length > 0).sort((a, b) => b.variants.length - a.variants.length)
  const lists = sized.map(labelsOf)
  if (sized.length === 0 || lists.includes(null)) return NO_COLUMNS
  const labels = [...new Set(lists.flatMap((list) => list ?? []))]
  const longestPrice = Math.max(...products.flatMap(priceTexts).map((price) => price.length))
  const longestLabel = Math.max(...labels.map((label) => label.length))
  const chars = Math.max(longestPrice, Math.ceil(longestLabel * LABEL_SHARE))
  return labels.length <= MOST_COLUMNS && labels.length * chars <= MOST_CHARS ? { labels, chars } : NO_COLUMNS
}

/** One price of a row under the columns: its size (null for an item with one price) and the amount. */
export type Cell = { label: string | null; amount: string }

/** A product's prices, one place per column. An item with one price takes the last column, where the eye runs down the amounts. */
export function cellsOf(product: Product, labels: readonly string[]): (Cell | null)[] {
  if (product.variants.length === 0) return labels.map((_, index) => (index === labels.length - 1 ? { label: null, amount: formatPeso(product.price) } : null))
  return labels.map((label) => {
    const variant = product.variants.find((candidate) => candidate.label.trim() === label)
    return variant === undefined ? null : { label, amount: formatPeso(variant.price) }
  })
}

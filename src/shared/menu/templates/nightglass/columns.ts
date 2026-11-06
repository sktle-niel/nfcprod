import type { Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'

/** More sizes than this, or a longer size name, does not fit across a phone: the category then stacks its sizes down one column. */
const MAX_COLUMNS = 3
const MAX_LABEL = 7
/** A column head is set smaller than the prices under it, so a letter of it takes about this much of a price digit. */
const HEAD_LETTER = 0.85
/** Columns times their width from which a name no longer fits beside the prices on a phone, and takes a line of its own. */
const TIGHT_FROM = 16

/** How the prices of one category stand on the board. */
export type PricePlan = {
  /** The size names across the top of the price columns, or none for a category of plain prices or stacked sizes. */
  columns: string[]
  /** True when the sizes stand down one column, each with its name, instead of across. */
  stacked: boolean
  /** The width of one price column, in digits. */
  cell: number
  /** True when the columns leave too little room for a name on a phone. */
  tight: boolean
}

const sameSize = (label: string) => label.trim().toLowerCase()

/** Every size name of a category once, in the order the menu reads: a size no earlier product had goes right after the one before it. */
export function sizeColumns(products: readonly Product[]): string[] {
  const columns: string[] = []
  for (const { variants } of products) {
    let next = 0
    for (const { label } of variants) {
      const known = columns.findIndex((column) => sameSize(column) === sameSize(label))
      if (known < 0) columns.splice(next, 0, label)
      next = (known < 0 ? next : known) + 1
    }
  }
  return columns
}

/** The column of a size, or -1 for a size the plan has no column for. */
export const columnOf = (columns: readonly string[], label: string) => columns.findIndex((column) => sameSize(column) === sameSize(label))

/** Two sizes of a product under one name would need one cell, and a price would be lost. */
const hasTwins = ({ variants }: Product) => new Set(variants.map(({ label }) => sameSize(label))).size < variants.length

export function pricePlan(products: readonly Product[]): PricePlan {
  const columns = sizeColumns(products)
  const stacked = columns.length > MAX_COLUMNS || columns.some((column) => column.trim().length > MAX_LABEL || column.trim() === '') || products.some(hasTwins)
  const prices = products.flatMap(({ price, variants }) => (variants.length === 0 ? [price] : variants.map((variant) => variant.price)))
  const widest = Math.max(...prices.map((price) => formatPeso(price).length))
  const label = Math.max(0, ...columns.map((column) => Math.ceil(column.trim().length * HEAD_LETTER)))
  const cell = Math.max(widest, label)
  return { columns: stacked ? [] : columns, stacked, cell, tight: !stacked && columns.length * cell >= TIGHT_FROM }
}

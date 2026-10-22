import { LIMITS, type Category, type ModifierGroup, type Product, type ProductInput, type ProductTag } from '@/entities/menu/menu'
import { priceInput, readPrice } from '@/entities/menu/price'
import { validateProductInput, type ProductField } from '@/entities/menu/validateProduct'
import { matchKey } from '@/shared/lib/checks'
import { pictureSrc } from '@/shared/menu/picture'
import type { ErrorCode } from '@/shared/lib/validation'

/** One size as the owner is typing it. The price is text until the form is checked. */
export type SizeRow = {
  /** Identifies the row on screen. Not the size's id. */
  key: string
  /** The id the size already has in the menu, or null for a new one. */
  id: string | null
  label: string
  price: string
  /** Added by the owner a moment ago: its name box takes the focus. */
  fresh: boolean
}

export type FormState = {
  /** The product's id, or null for a new one. */
  id: string | null
  name: string
  description: string
  categoryId: string
  sized: boolean
  price: string
  sizes: SizeRow[]
  tags: ProductTag[]
  groupIds: string[]
  image: string | null
  available: boolean
}

/** What a save tells the page: the item's name, and whether it is new. */
export type SavedProduct = { name: string; added: boolean }

/** The order the fields are on screen: the first one with a problem takes the focus. */
export const FIELD_ORDER: readonly ProductField[] = ['name', 'description', 'categoryId', 'price', 'variants', 'tags', 'groupIds', 'image']

let rows = 0

export function newRow(label = '', price = '', id: string | null = null, fresh = false): SizeRow {
  rows += 1
  return { key: `size-${rows}`, id, label, price, fresh }
}

export function initialState(product: Product | null, categoryId: string | null, groups: readonly ModifierGroup[]): FormState {
  if (!product) {
    return { id: null, name: '', description: '', categoryId: categoryId ?? '', sized: false, price: '', sizes: [], tags: [], groupIds: [], image: null, available: true }
  }
  const known = new Set(groups.map((group) => group.id))
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    sized: product.variants.length > 0,
    // With sizes the product's price is its lowest size: a good start when the owner goes back to one price.
    price: priceInput(product.price),
    sizes: product.variants.map((variant) => newRow(variant.label, priceInput(variant.price), variant.id)),
    tags: product.tags,
    // A group deleted since the product was saved is dropped here, or the repository would refuse the whole product.
    groupIds: product.groupIds.filter((id) => known.has(id)),
    // A picture from an address the pages would not draw (an old row, a changed storage address) is shown as none here too,
    // and the owner's browser never asks that host. Saving then clears it, which the repository would otherwise refuse for good.
    image: pictureSrc(product.image),
    available: product.available,
  }
}

/** Switches between one price and sizes. A first visit to sizes starts with one row that carries the typed price. */
export function chooseMode(state: FormState, sized: boolean): FormState {
  if (state.sized === sized) return state
  if (sized && state.sizes.length === 0) return { ...state, sized, sizes: [newRow('', state.price)] }
  return { ...state, sized }
}

/** Adds the preset sizes that are not there yet, with the typed price to start from. Rows with no name are dropped. */
export function withPresetSizes(state: FormState, labels: readonly string[]): FormState {
  const kept = state.sizes.filter((row) => row.label.trim() !== '')
  const have = new Set(kept.map((row) => matchKey(row.label)))
  const added = labels.filter((label) => !have.has(matchKey(label))).map((label) => newRow(label, state.price))
  return { ...state, sizes: [...kept, ...added].slice(0, LIMITS.variants) }
}

/** The validator's codes, and 'none' for sizes with no row: the validator never sees that case. */
export type FormCode = ErrorCode | 'none'

export type Checked = { ok: true; input: ProductInput } | { ok: false; errors: Partial<Record<ProductField, FormCode>> }

/**
 * Turns what is typed into a product, with the same checks the repository makes. A price that cannot be read becomes NaN,
 * which the validator refuses as badly formed, so a typo is never saved as a different price. A well-formed price above the
 * limit is passed on as it is, so the validator answers "too high".
 */
export function checkForm(state: FormState, context: { categories: readonly Category[]; groups: readonly ModifierGroup[] }): Checked {
  const variants = state.sizes.map((row) => ({
    ...(row.id === null ? {} : { id: row.id }),
    label: row.label,
    price: readPrice(row.price) ?? Number.NaN,
  }))
  const result = validateProductInput(
    {
      ...(state.id === null ? {} : { id: state.id }),
      categoryId: state.categoryId,
      name: state.name,
      description: state.description,
      price: state.sized ? 0 : (readPrice(state.price) ?? Number.NaN),
      variants: state.sized ? variants : [],
      tags: state.tags,
      available: state.available,
      image: state.image,
      groupIds: state.groupIds,
    },
    context,
  )
  const errors: Partial<Record<ProductField, FormCode>> = result.ok ? {} : { ...result.errors }
  // Sizes with no row would pass as a price of zero: refuse them here.
  if (state.sized && state.sizes.length === 0) errors.variants = 'none'
  if (errors.price && state.price.trim() === '') errors.price = 'required'
  if (result.ok && Object.keys(errors).length === 0) return { ok: true, input: result.value }
  return { ok: false, errors }
}

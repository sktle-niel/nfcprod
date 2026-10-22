import { isTrustedPicture } from '@/config/pictures'
import { LIMITS, type Category, type Menu, type ModifierGroup, type Product } from '@/entities/menu/menu'
import { validateCategoryInput, validateGroupInput, type PricedItem } from '@/entities/menu/validate'
import { validateProductInput } from '@/entities/menu/validateProduct'
import { PRESETS } from '@/presets'
import type { MergedPreset, PresetSample } from '@/presets/types'
import { matchKey } from '@/shared/lib/checks'
import type { ErrorCode } from '@/shared/lib/validation'
import { OwnerError } from './ownerRepository'

// The menu edits of the mock owner repository. Each takes the menu as it is and gives back a new one, with ids made by
// `newId`, or throws the OwnerError the screen shows. Every input goes through the editors' own validators.

type NewId = () => string

/** An 'invalid' refusal that names each refused field with its code. */
export function invalid(errors: Partial<Record<string, ErrorCode>>): OwnerError {
  const fields: Record<string, string> = {}
  for (const [field, code] of Object.entries(errors)) if (code !== undefined) fields[field] = code
  return new OwnerError('invalid', fields)
}

/** Where the item with `id` sits in `list`: -1 without an id (a new item). An id that nothing has is 'notFound'. */
function indexOf(list: readonly { id: string }[], id: string | undefined): number {
  if (id === undefined) return -1
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) throw new OwnerError('notFound')
  return index
}

/** `list` with `item` in place of the one at `index`, or added at the end for -1. */
function put<T>(list: readonly T[], index: number, item: T): T[] {
  return index < 0 ? [...list, item] : list.map((old, i) => (i === index ? item : old))
}

/** Sizes or options with ids: an id the item already had stays, anything else gets a new one. */
function withIds(items: readonly PricedItem[], known: readonly { id: string }[], newId: NewId) {
  return items.map(({ id, label, price }) => ({
    id: id !== undefined && known.some((item) => item.id === id) ? id : newId(),
    label,
    price,
  }))
}

/** The products in the order of their categories. Inside a category they keep their order (the sort is stable). */
export function arrange(menu: Menu): Menu {
  const rank = new Map(menu.categories.map((category, index) => [category.id, index]))
  const place = (product: Product) => rank.get(product.categoryId) ?? menu.categories.length
  return { ...menu, products: [...menu.products].sort((a, b) => place(a) - place(b)) }
}

/** Adds a category at the end, or changes the one with the input's id in place. */
export function putCategory(menu: Menu, input: unknown, newId: NewId): Menu {
  const checked = validateCategoryInput(input, menu.categories)
  if (!checked.ok) throw invalid(checked.errors)
  const { id, name, visible } = checked.value
  const index = indexOf(menu.categories, id)
  const category: Category = { id: id ?? newId(), name, visible }
  return { ...menu, categories: put(menu.categories, index, category) }
}

/** Adds an add-on group at the end, or changes the one with the input's id in place. */
export function putGroup(menu: Menu, input: unknown, newId: NewId): Menu {
  const checked = validateGroupInput(input, menu.groups)
  if (!checked.ok) throw invalid(checked.errors)
  const { id, name, required, min, max, options } = checked.value
  const index = indexOf(menu.groups, id)
  const known = menu.groups[index]?.options ?? []
  const group: ModifierGroup = { id: id ?? newId(), name, required, min, max, options: withIds(options, known, newId) }
  return { ...menu, groups: put(menu.groups, index, group) }
}

/**
 * Adds a product at the end of its category, or changes the one with the input's id. An edit inside its category keeps
 * its place; one that moves to another category goes last there. With sizes, the validator sets the price to the lowest.
 */
export function putProduct(menu: Menu, input: unknown, newId: NewId): Menu {
  const checked = validateProductInput(input, menu)
  if (!checked.ok) throw invalid(checked.errors)
  const { id, categoryId, name, description, price, variants, tags, available, image, groupIds } = checked.value
  // The server only keeps pictures from its own storage. The mock keeps the same rule.
  if (image !== null && !isTrustedPicture(image)) throw invalid({ image: 'invalid' })
  const index = indexOf(menu.products, id)
  const old = menu.products[index]
  const product: Product = {
    id: id ?? newId(),
    categoryId,
    name,
    description,
    price,
    variants: withIds(variants, old?.variants ?? [], newId),
    tags,
    available,
    image,
    groupIds,
  }
  const stays = old !== undefined && old.categoryId === categoryId
  const products = stays ? put(menu.products, index, product) : [...menu.products.filter((other) => other !== old), product]
  // A product added at the end moves up to the last place of its category.
  return arrange({ ...menu, products })
}

/** The quick sold-out switch: changes `available` and nothing else. */
export function markAvailable(menu: Menu, id: string, available: unknown): Menu {
  if (typeof available !== 'boolean') throw new OwnerError('invalid', { available: 'invalid' })
  if (!menu.products.some((product) => product.id === id)) throw new OwnerError('notFound')
  return { ...menu, products: menu.products.map((product) => (product.id === id ? { ...product, available } : product)) }
}

// Each size up costs ₱20 more than the one before (S ₱120, M ₱140, L ₱160): a common step in local coffee and milk tea shops.
const SIZE_STEP = 2000

/** The sizes of the preset a sample came from. A merged sample no longer says, so it is found by category and name. */
function sizesOf(sample: PresetSample, preset: MergedPreset): string[] {
  const same = (other: PresetSample) =>
    matchKey(other.category) === matchKey(sample.category) && matchKey(other.name) === matchKey(sample.name)
  return preset.types.map((type) => PRESETS[type]).find((source) => source.samples.some(same))?.sizes ?? []
}

function sampleInput(sample: PresetSample, preset: MergedPreset, categories: readonly Category[]) {
  const sizes = sample.sized === false ? [] : sizesOf(sample, preset).slice(0, LIMITS.variants)
  return {
    categoryId: categories.find((category) => matchKey(category.name) === matchKey(sample.category))?.id,
    name: sample.name,
    description: sample.description,
    price: sample.price,
    variants: sizes.map((label, step) => ({ label, price: Math.min(LIMITS.priceMax, sample.price + step * SIZE_STEP) })),
    tags: sample.tags,
    available: true,
    image: null,
    groupIds: [],
  }
}

/**
 * The first menu of a new business: the preset's categories (all visible) and add-on groups, and its samples as
 * products when asked. Built through the same edits as the editors, so it holds nothing they would refuse.
 */
export function startMenu(preset: MergedPreset, samples: boolean, newId: NewId): Menu {
  let menu: Menu = { categories: [], products: [], groups: [] }
  for (const name of preset.categories) menu = putCategory(menu, { name, visible: true }, newId)
  for (const group of preset.groups) menu = putGroup(menu, group, newId)
  if (!samples) return menu
  for (const sample of preset.samples) menu = putProduct(menu, sampleInput(sample, preset, menu.categories), newId)
  return menu
}

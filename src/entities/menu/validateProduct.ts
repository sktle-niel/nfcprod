import {
  checkInteger,
  checkList,
  checkText,
  combine,
  fail,
  hasDuplicates,
  isMissing,
  isOneOf,
  pass,
  readField,
  safely,
  type Check,
} from '@/shared/lib/checks'
import type { Validated } from '@/shared/lib/validation'
import { checkImageAddress } from './image'
import { LIMITS, PRODUCT_TAGS, type Category, type ModifierGroup, type ProductInput, type ProductTag } from './menu'
import { checkPricedItems, readId, withId } from './validate'

export type ProductField = 'name' | 'description' | 'categoryId' | 'price' | 'variants' | 'tags' | 'groupIds' | 'image'

/** The id of one of `list`. */
function checkKnownId(value: unknown, list: readonly { id: string }[]): Check<string> {
  if (isMissing(value) || value === '') return fail('required')
  return typeof value === 'string' && list.some((item) => item.id === value) ? pass(value) : fail('invalid')
}

function checkTags(value: unknown): Check<ProductTag[]> {
  if (isMissing(value)) return pass([])
  const list = checkList(value, PRODUCT_TAGS.length)
  if (!list.ok) return list
  const tags: ProductTag[] = []
  for (const tag of list.value) {
    if (!isOneOf(PRODUCT_TAGS, tag)) return fail('invalid')
    tags.push(tag)
  }
  return hasDuplicates(tags) ? fail('duplicate') : pass(tags)
}

function checkGroupIds(value: unknown, groups: readonly ModifierGroup[]): Check<string[]> {
  if (isMissing(value)) return pass([])
  const list = checkList(value, LIMITS.groups)
  if (!list.ok) return list
  const ids: string[] = []
  for (const id of list.value) {
    const known = checkKnownId(id, groups)
    if (!known.ok) return fail('invalid')
    ids.push(known.value)
  }
  return hasDuplicates(ids) ? fail('duplicate') : pass(ids)
}

/**
 * A product as the owner typed it. Without variants the price is its own; with variants it is the lowest variant
 * price (the menu shows "from"). A missing description, list or picture reads as empty; `available` is true unless it
 * is `false`.
 */
export function validateProductInput(
  input: unknown,
  context: { categories: readonly Category[]; groups: readonly ModifierGroup[] },
): Validated<ProductInput, ProductField> {
  return safely<ProductInput, ProductField>('name', () => {
    const rawVariants = readField(input, 'variants')
    const variants = isMissing(rawVariants)
      ? pass([])
      : checkPricedItems(rawVariants, { items: LIMITS.variants, label: LIMITS.variantLabel })
    // With variants the typed price is not used: a bad one there is no reason to refuse the product.
    const fromVariants = Array.isArray(rawVariants) && rawVariants.length > 0
    const price = fromVariants
      ? pass(variants.ok ? Math.min(...variants.value.map((variant) => variant.price)) : 0)
      : checkInteger(readField(input, 'price'), 0, LIMITS.priceMax)
    const result = combine({
      name: checkText(readField(input, 'name'), { max: LIMITS.productName }),
      description: checkText(readField(input, 'description'), { min: 0, max: LIMITS.description }),
      categoryId: checkKnownId(readField(input, 'categoryId'), context.categories),
      price,
      variants,
      tags: checkTags(readField(input, 'tags')),
      groupIds: checkGroupIds(readField(input, 'groupIds'), context.groups),
      image: checkImageAddress(readField(input, 'image')),
    })
    if (!result.ok) return result
    const available = readField(input, 'available') !== false
    return { ok: true, value: withId(readId(input), { ...result.value, available }) }
  })
}

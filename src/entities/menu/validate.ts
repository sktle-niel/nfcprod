import {
  checkBoolean,
  checkInteger,
  checkList,
  checkText,
  combine,
  fail,
  hasDuplicates,
  matchKey,
  pass,
  readField,
  safely,
  type Check,
} from '@/shared/lib/checks'
import type { Validated } from '@/shared/lib/validation'
import { LIMITS, type Category, type CategoryInput, type GroupInput, type ModifierGroup } from './menu'

/** The id of something being edited. Ids are made by the repository; anything that is not a usable one means "new". */
export function readId(input: unknown): string | undefined {
  const id = readField(input, 'id')
  return typeof id === 'string' && id.length > 0 && id.length <= 128 ? id : undefined
}

/** `value` with its id, or without one: an optional field is left out, never set to undefined. */
export function withId<T extends object>(id: string | undefined, value: T): T | (T & { id: string }) {
  return id === undefined ? value : { ...value, id }
}

/** True when nothing in `existing` has the id: then the input adds a new one. */
function isNew(id: string | undefined, existing: readonly { id: string }[]): boolean {
  return id === undefined || !existing.some((item) => item.id === id)
}

/** A name that no other entry of `existing` has, ignoring case. The entry with the same id is the one being edited. */
function checkName(value: unknown, max: number, existing: readonly { id: string; name: string }[], id: string | undefined) {
  const name = checkText(value, { max })
  if (!name.ok) return name
  const key = matchKey(name.value)
  return existing.some((other) => other.id !== id && matchKey(other.name) === key) ? fail('duplicate') : name
}

export type PricedItem = { id?: string; label: string; price: number }

/**
 * A list of labels with prices, such as the sizes of a product or the options of an add-on group: labels cleaned and
 * unique ignoring case, prices whole centavos from 0 to LIMITS.priceMax. One code for the whole list: the first problem.
 */
export function checkPricedItems(value: unknown, limits: { items: number; label: number }): Check<PricedItem[]> {
  const list = checkList(value, limits.items)
  if (!list.ok) return list
  const items: PricedItem[] = []
  for (const raw of list.value) {
    const label = checkText(readField(raw, 'label'), { max: limits.label })
    if (!label.ok) return label
    const price = checkInteger(readField(raw, 'price'), 0, LIMITS.priceMax)
    if (!price.ok) return price
    items.push(withId(readId(raw), { label: label.value, price: price.value }))
  }
  if (hasDuplicates(items.map((item) => matchKey(item.label)))) return fail('duplicate')
  const ids = items.flatMap((item) => (item.id === undefined ? [] : [item.id]))
  return hasDuplicates(ids) ? fail('invalid') : pass(items)
}

/** A category as the owner typed it. A new one may not take the menu past LIMITS.categories ('tooMany' on the name). */
export function validateCategoryInput(
  input: unknown,
  existing: readonly Category[],
): Validated<CategoryInput, 'name' | 'visible'> {
  return safely<CategoryInput, 'name' | 'visible'>('name', () => {
    const id = readId(input)
    const full = isNew(id, existing) && existing.length >= LIMITS.categories
    const result = combine({
      name: full ? fail('tooMany') : checkName(readField(input, 'name'), LIMITS.categoryName, existing, id),
      visible: checkBoolean(readField(input, 'visible')),
    })
    return result.ok ? { ok: true, value: withId(id, result.value) } : result
  })
}

type GroupField = 'name' | 'options' | 'min' | 'max' | 'required'

/** Required means at least one pick (min 1 or more); optional means min 0. Anything else is 'invalid' on min. */
function checkMin(value: unknown, max: Check<number>, required: Check<boolean>): Check<number> {
  const min = checkInteger(value, 0, max.ok ? max.value : LIMITS.options)
  if (!min.ok || !required.ok) return min
  return required.value === min.value >= 1 ? min : fail('invalid')
}

/**
 * An add-on group as the owner typed it: a unique name, 1 to LIMITS.options options, and how many the customer picks
 * (`min` to `max`, with `max` at most the number of options). A new one may not pass LIMITS.groups.
 */
export function validateGroupInput(input: unknown, existing: readonly ModifierGroup[]): Validated<GroupInput, GroupField> {
  return safely<GroupInput, GroupField>('name', () => {
    const id = readId(input)
    const full = isNew(id, existing) && existing.length >= LIMITS.groups
    const listed = checkPricedItems(readField(input, 'options'), { items: LIMITS.options, label: LIMITS.optionLabel })
    const options = listed.ok && listed.value.length === 0 ? fail('required') : listed
    const required = checkBoolean(readField(input, 'required'))
    const max = checkInteger(readField(input, 'max'), 1, options.ok ? options.value.length : LIMITS.options)
    const result = combine({
      name: full ? fail('tooMany') : checkName(readField(input, 'name'), LIMITS.groupName, existing, id),
      options,
      min: checkMin(readField(input, 'min'), max, required),
      max,
      required,
    })
    return result.ok ? { ok: true, value: withId(id, result.value) } : result
  })
}

import { describe, expect, it } from 'vitest'
import { deepFreeze } from '@/shared/lib/freeze'
import { LIMITS, type Category, type ModifierGroup } from './menu'
import { validateCategoryInput, validateGroupInput } from './validate'

const categories: Category[] = deepFreeze([
  { id: 'c1', name: 'Hot', visible: true },
  { id: 'c2', name: 'Iced Drinks', visible: false },
])

const manyCategories: Category[] = Array.from({ length: LIMITS.categories }, (_, i) => ({ id: `c${i}`, name: `Category ${i}`, visible: true }))

describe('validateCategoryInput', () => {
  it('accepts a new category with a cleaned name and no id', () => {
    const result = validateCategoryInput({ name: '  Blended   drinks ', visible: true }, categories)
    expect(result).toEqual({ ok: true, value: { name: 'Blended drinks', visible: true } })
    expect(result.ok && 'id' in result.value).toBe(false)
  })

  it('keeps the id of the category being edited', () => {
    expect(validateCategoryInput({ id: 'c1', name: 'Hot drinks', visible: false }, categories)).toEqual({
      ok: true,
      value: { id: 'c1', name: 'Hot drinks', visible: false },
    })
  })

  it('lets a category keep its own name, in another case', () => {
    expect(validateCategoryInput({ id: 'c2', name: 'ICED DRINKS', visible: true }, categories).ok).toBe(true)
  })

  it('refuses a name another category has, ignoring case and spaces', () => {
    expect(validateCategoryInput({ name: ' iced   DRINKS', visible: true }, categories)).toEqual({
      ok: false,
      errors: { name: 'duplicate' },
    })
    expect(validateCategoryInput({ id: 'c1', name: 'Iced drinks', visible: true }, categories)).toEqual({
      ok: false,
      errors: { name: 'duplicate' },
    })
  })

  it.each([undefined, null, '', '   ', '​'])('calls the name %j required', (name) => {
    expect(validateCategoryInput({ name, visible: true }, categories)).toEqual({ ok: false, errors: { name: 'required' } })
  })

  it('takes a name of up to 40 characters', () => {
    expect(validateCategoryInput({ name: 'a'.repeat(LIMITS.categoryName), visible: true }, categories).ok).toBe(true)
    expect(validateCategoryInput({ name: 'a'.repeat(LIMITS.categoryName + 1), visible: true }, categories)).toEqual({
      ok: false,
      errors: { name: 'tooLong' },
    })
  })

  it('refuses a name or a visibility of the wrong kind', () => {
    expect(validateCategoryInput({ name: 42, visible: 'yes' }, categories)).toEqual({
      ok: false,
      errors: { name: 'invalid', visible: 'invalid' },
    })
    expect(validateCategoryInput({ name: 'Cold' }, categories)).toEqual({ ok: false, errors: { visible: 'required' } })
  })

  it('refuses a new category once the menu has the most it can have, but still lets one be edited', () => {
    expect(validateCategoryInput({ name: 'One more', visible: true }, manyCategories)).toEqual({
      ok: false,
      errors: { name: 'tooMany' },
    })
    expect(validateCategoryInput({ id: 'c3', name: 'Renamed', visible: true }, manyCategories).ok).toBe(true)
  })

  it('reads an id it cannot use as a new category', () => {
    for (const id of [42, '', null, {}, 'x'.repeat(129)]) {
      const result = validateCategoryInput({ id, name: 'Cold', visible: true }, categories)
      expect(result).toEqual({ ok: true, value: { name: 'Cold', visible: true } })
    }
  })

  it.each([null, undefined, 'Hot', 42, []])('calls every field required for %j', (input) => {
    expect(validateCategoryInput(input, categories)).toEqual({ ok: false, errors: { name: 'required', visible: 'required' } })
  })

  it('keeps "__proto__" from JSON out of the result', () => {
    const input: unknown = JSON.parse('{"__proto__": {"visible": true}, "name": "Cold", "visible": false}')
    const result = validateCategoryInput(input, categories)
    expect(result).toEqual({ ok: true, value: { name: 'Cold', visible: false } })
    expect(result.ok && Object.hasOwn(result.value, '__proto__')).toBe(false)
  })

  it('never throws and never changes its input', () => {
    const { proxy, revoke } = Proxy.revocable({ name: 'Cold', visible: true }, {})
    revoke()
    expect(validateCategoryInput(proxy, categories).ok).toBe(false)
    const input = deepFreeze({ id: 'c1', name: '  Hot  ', visible: true })
    validateCategoryInput(input, categories)
    expect(input).toEqual({ id: 'c1', name: '  Hot  ', visible: true })
  })
})

const milk: ModifierGroup = {
  id: 'g1',
  name: 'Milk',
  required: false,
  min: 0,
  max: 1,
  options: [{ id: 'o1', label: 'Oat', price: 4000 }],
}
const groups: ModifierGroup[] = deepFreeze([milk])

const syrups = {
  name: 'Syrups',
  required: false,
  min: 0,
  max: 2,
  options: [
    { label: ' Vanilla ', price: 3000 },
    { label: 'Caramel', price: 3000 },
    { label: 'Hazelnut', price: 0 },
  ],
}

const option = (i: number) => ({ label: `Option ${i}`, price: 100 * i })

describe('validateGroupInput', () => {
  it('accepts a new group with cleaned labels and no id', () => {
    expect(validateGroupInput(syrups, groups)).toEqual({
      ok: true,
      value: { ...syrups, options: [{ label: 'Vanilla', price: 3000 }, syrups.options[1], syrups.options[2]] },
    })
  })

  it('keeps the ids of the group and its options when editing', () => {
    const edit = { ...milk, name: 'Milks', options: [...milk.options, { label: 'Soy', price: 3500 }] }
    expect(validateGroupInput(edit, groups)).toEqual({ ok: true, value: edit })
  })

  it('refuses a name another group has, ignoring case', () => {
    expect(validateGroupInput({ ...syrups, name: ' MILK ' }, groups)).toEqual({ ok: false, errors: { name: 'duplicate' } })
    expect(validateGroupInput({ ...milk, name: 'milk' }, groups).ok).toBe(true)
  })

  it('checks the name like any name', () => {
    expect(validateGroupInput({ ...syrups, name: '' }, groups)).toEqual({ ok: false, errors: { name: 'required' } })
    expect(validateGroupInput({ ...syrups, name: 'a'.repeat(LIMITS.groupName + 1) }, groups)).toEqual({
      ok: false,
      errors: { name: 'tooLong' },
    })
  })

  it('refuses a new group once the menu has the most it can have', () => {
    const full = Array.from({ length: LIMITS.groups }, (_, i) => ({ ...milk, id: `g${i}`, name: `Group ${i}` }))
    expect(validateGroupInput(syrups, full)).toEqual({ ok: false, errors: { name: 'tooMany' } })
  })

  it.each([
    ['not a list', 'Vanilla', 'invalid'],
    ['an empty list', [], 'required'],
    ['too many options', Array.from({ length: LIMITS.options + 1 }, (_, i) => option(i)), 'tooMany'],
    ['an option without a label', [{ label: '  ', price: 0 }], 'required'],
    ['an option that is not an object', ['Vanilla'], 'required'],
    ['a label that is too long', [{ label: 'a'.repeat(LIMITS.optionLabel + 1), price: 0 }], 'tooLong'],
    ['a label twice, in another case', [{ label: 'Vanilla', price: 0 }, { label: 'VANILLA ', price: 0 }], 'duplicate'],
    ['an option id twice', [{ id: 'o1', label: 'A', price: 0 }, { id: 'o1', label: 'B', price: 0 }], 'invalid'],
    ['a negative price', [{ label: 'Vanilla', price: -1 }], 'range'],
    ['a price over the limit', [{ label: 'Vanilla', price: LIMITS.priceMax + 1 }], 'range'],
    ['a price that is not whole centavos', [{ label: 'Vanilla', price: 30.5 }], 'invalid'],
    ['a price written as text', [{ label: 'Vanilla', price: '30' }], 'invalid'],
    ['a missing price', [{ label: 'Vanilla' }], 'required'],
  ])('refuses options that are %s', (_name, options, error) => {
    const result = validateGroupInput({ ...syrups, min: 0, max: 1, options }, groups)
    expect(result.ok === false && result.errors.options).toBe(error)
  })

  it('takes a max from 1 to the number of options', () => {
    expect(validateGroupInput({ ...syrups, max: 3 }, groups).ok).toBe(true)
    expect(validateGroupInput({ ...syrups, max: 4 }, groups)).toEqual({ ok: false, errors: { max: 'range' } })
    expect(validateGroupInput({ ...syrups, max: 0 }, groups)).toEqual({ ok: false, errors: { max: 'range' } })
    expect(validateGroupInput({ ...syrups, max: 1.5 }, groups)).toEqual({ ok: false, errors: { max: 'invalid' } })
  })

  it('takes a min from 0 to max', () => {
    expect(validateGroupInput({ ...syrups, required: true, min: 2, max: 2 }, groups).ok).toBe(true)
    expect(validateGroupInput({ ...syrups, required: true, min: 3, max: 2 }, groups)).toEqual({
      ok: false,
      errors: { min: 'range' },
    })
    expect(validateGroupInput({ ...syrups, min: -1 }, groups)).toEqual({ ok: false, errors: { min: 'range' } })
  })

  it('keeps required and min in step: required means at least one pick, optional means none needed', () => {
    expect(validateGroupInput({ ...syrups, required: true, min: 1 }, groups).ok).toBe(true)
    expect(validateGroupInput({ ...syrups, required: true, min: 0 }, groups)).toEqual({ ok: false, errors: { min: 'invalid' } })
    expect(validateGroupInput({ ...syrups, required: false, min: 1 }, groups)).toEqual({ ok: false, errors: { min: 'invalid' } })
  })

  it('reports every problem at once', () => {
    expect(validateGroupInput({ name: '', required: 'yes', min: 'one', max: null, options: {} }, groups)).toEqual({
      ok: false,
      errors: { name: 'required', required: 'invalid', min: 'invalid', max: 'required', options: 'invalid' },
    })
  })

  it('never throws and never changes its input', () => {
    const hostile = {
      ...syrups,
      get options(): unknown {
        throw new Error('boom')
      },
    }
    expect(validateGroupInput(hostile, groups).ok).toBe(false)
    const input = deepFreeze(structuredClone(syrups))
    validateGroupInput(input, groups)
    expect(input).toEqual(syrups)
  })
})

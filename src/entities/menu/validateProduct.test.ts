import { describe, expect, it } from 'vitest'
import { deepFreeze } from '@/shared/lib/freeze'
import { LIMITS, PRODUCT_TAGS, type Category, type ModifierGroup } from './menu'
import { validateProductInput } from './validateProduct'

const group = (id: string): ModifierGroup => ({ id, name: id, required: false, min: 0, max: 1, options: [{ id: `${id}o`, label: 'A', price: 0 }] })

const context = deepFreeze({
  categories: [
    { id: 'c1', name: 'Hot', visible: true },
    { id: 'c2', name: 'Iced', visible: true },
  ] satisfies Category[],
  groups: [group('g1'), group('g2')],
})

const latte = {
  categoryId: 'c1',
  name: '  Spanish   Latte ',
  description: ' Espresso and milk. ',
  price: 16500,
  variants: [],
  tags: ['bestSeller'],
  available: true,
  image: null,
  groupIds: ['g1'],
}

const clean = { ...latte, name: 'Spanish Latte', description: 'Espresso and milk.' }

/** The one problem of `input`, by field. */
function errorsOf(input: unknown) {
  const result = validateProductInput(input, context)
  return result.ok ? {} : result.errors
}

describe('validateProductInput', () => {
  it('accepts a product with its name and description cleaned', () => {
    const result = validateProductInput(latte, context)
    expect(result).toEqual({ ok: true, value: clean })
    expect(result.ok && 'id' in result.value).toBe(false)
  })

  it('keeps the id of the product being edited', () => {
    expect(validateProductInput({ ...latte, id: 'p1' }, context)).toEqual({ ok: true, value: { ...clean, id: 'p1' } })
  })

  it('reads a missing description, list or picture as empty, and a missing availability as available', () => {
    const { categoryId, name, price } = latte
    expect(validateProductInput({ categoryId, name, price }, context)).toEqual({
      ok: true,
      value: { categoryId, name: 'Spanish Latte', price, description: '', variants: [], tags: [], groupIds: [], image: null, available: true },
    })
  })

  it('marks a product sold out only for false', () => {
    const availability = (available: unknown) => {
      const result = validateProductInput({ ...latte, available }, context)
      return result.ok && result.value.available
    }
    expect(availability(false)).toBe(false)
    expect(availability(true)).toBe(true)
    expect(availability('no')).toBe(true)
  })

  it('checks the name and the description', () => {
    expect(errorsOf({ ...latte, name: '   ' })).toEqual({ name: 'required' })
    expect(errorsOf({ ...latte, name: 'a'.repeat(LIMITS.productName + 1) })).toEqual({ name: 'tooLong' })
    expect(errorsOf({ ...latte, name: ['Latte'] })).toEqual({ name: 'invalid' })
    expect(errorsOf({ ...latte, description: 'a'.repeat(LIMITS.description + 1) })).toEqual({ description: 'tooLong' })
    expect(errorsOf({ ...latte, description: 7 })).toEqual({ description: 'invalid' })
  })

  it('needs a category that is on the menu', () => {
    expect(errorsOf({ ...latte, categoryId: undefined })).toEqual({ categoryId: 'required' })
    expect(errorsOf({ ...latte, categoryId: '' })).toEqual({ categoryId: 'required' })
    expect(errorsOf({ ...latte, categoryId: 'c9' })).toEqual({ categoryId: 'invalid' })
    expect(errorsOf({ ...latte, categoryId: 1 })).toEqual({ categoryId: 'invalid' })
  })

  it('takes a price in whole centavos from 0 to the limit', () => {
    expect(validateProductInput({ ...latte, price: 0 }, context).ok).toBe(true)
    expect(validateProductInput({ ...latte, price: LIMITS.priceMax }, context).ok).toBe(true)
    expect(errorsOf({ ...latte, price: LIMITS.priceMax + 1 })).toEqual({ price: 'range' })
    expect(errorsOf({ ...latte, price: -1 })).toEqual({ price: 'range' })
    expect(errorsOf({ ...latte, price: 165.5 })).toEqual({ price: 'invalid' })
    expect(errorsOf({ ...latte, price: Number.NaN })).toEqual({ price: 'invalid' })
    expect(errorsOf({ ...latte, price: '165' })).toEqual({ price: 'invalid' })
    expect(errorsOf({ ...latte, price: undefined })).toEqual({ price: 'required' })
  })

  it('takes the lowest variant price as the price, whatever price was typed', () => {
    const sized = {
      ...latte,
      price: Number.NaN,
      variants: [
        { id: 'v1', label: ' M ', price: 16500 },
        { label: 'L', price: 18500 },
        { label: 'S', price: 14500 },
      ],
    }
    expect(validateProductInput(sized, context)).toEqual({
      ok: true,
      value: {
        ...clean,
        price: 14500,
        variants: [
          { id: 'v1', label: 'M', price: 16500 },
          { label: 'L', price: 18500 },
          { label: 'S', price: 14500 },
        ],
      },
    })
  })

  it.each([
    ['not a list', 'S, M, L', 'invalid'],
    ['too many', Array.from({ length: LIMITS.variants + 1 }, (_, i) => ({ label: `V${i}`, price: 100 })), 'tooMany'],
    ['without a label', [{ label: '', price: 100 }], 'required'],
    ['with a label that is too long', [{ label: 'a'.repeat(LIMITS.variantLabel + 1), price: 100 }], 'tooLong'],
    ['with the same label twice', [{ label: 'S', price: 100 }, { label: 's', price: 200 }], 'duplicate'],
    ['with a negative price', [{ label: 'S', price: -100 }], 'range'],
    ['with a price that is not whole centavos', [{ label: 'S', price: 99.5 }], 'invalid'],
  ])('refuses variants that are %s', (_name, variants, error) => {
    expect(errorsOf({ ...latte, variants })).toEqual({ variants: error })
  })

  it('takes tags from the list, each once', () => {
    expect(validateProductInput({ ...latte, tags: [...PRODUCT_TAGS] }, context).ok).toBe(true)
    expect(errorsOf({ ...latte, tags: ['organic'] })).toEqual({ tags: 'invalid' })
    expect(errorsOf({ ...latte, tags: ['__proto__'] })).toEqual({ tags: 'invalid' })
    expect(errorsOf({ ...latte, tags: ['new', 'new'] })).toEqual({ tags: 'duplicate' })
    expect(errorsOf({ ...latte, tags: [...PRODUCT_TAGS, 'new'] })).toEqual({ tags: 'tooMany' })
    expect(errorsOf({ ...latte, tags: 'spicy' })).toEqual({ tags: 'invalid' })
  })

  it('takes add-on groups that are on the menu, each once', () => {
    expect(validateProductInput({ ...latte, groupIds: ['g2', 'g1'] }, context).ok).toBe(true)
    expect(errorsOf({ ...latte, groupIds: ['g9'] })).toEqual({ groupIds: 'invalid' })
    expect(errorsOf({ ...latte, groupIds: [1] })).toEqual({ groupIds: 'invalid' })
    expect(errorsOf({ ...latte, groupIds: ['g1', 'g1'] })).toEqual({ groupIds: 'duplicate' })
    expect(errorsOf({ ...latte, groupIds: Array.from({ length: LIMITS.groups + 1 }, () => 'g1') })).toEqual({ groupIds: 'tooMany' })
    expect(errorsOf({ ...latte, groupIds: 'g1' })).toEqual({ groupIds: 'invalid' })
  })

  it('takes a picture as a picture data URL or an https link', () => {
    const jpeg = `data:image/jpeg;base64,${btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))}`
    expect(validateProductInput({ ...latte, image: jpeg }, context).ok).toBe(true)
    expect(validateProductInput({ ...latte, image: 'https://cdn.example.com/latte.webp' }, context).ok).toBe(true)
    for (const image of ['', 'javascript:alert(1)', 'http://cdn.example.com/a.png', 'data:image/svg+xml;base64,PHN2Zz4=', 5]) {
      expect(errorsOf({ ...latte, image })).toEqual({ image: 'invalid' })
    }
  })

  it('reports every problem at once', () => {
    expect(errorsOf({ name: '', categoryId: 'nope', price: -5, tags: ['x'], groupIds: ['x'], image: 'x', description: 1 })).toEqual({
      name: 'required',
      description: 'invalid',
      categoryId: 'invalid',
      price: 'range',
      tags: 'invalid',
      groupIds: 'invalid',
      image: 'invalid',
    })
  })

  it.each([null, undefined, 'Latte', 42, []])('calls the needed fields required for %j', (input) => {
    expect(errorsOf(input)).toEqual({ name: 'required', categoryId: 'required', price: 'required' })
  })

  it('keeps "__proto__" from JSON out of the result', () => {
    const input: unknown = JSON.parse(`{"__proto__": {"price": 1}, ${JSON.stringify(latte).slice(1)}`)
    const result = validateProductInput(input, context)
    expect(result).toEqual({ ok: true, value: clean })
    expect(result.ok && Object.hasOwn(result.value, '__proto__')).toBe(false)
  })

  it('never throws and never changes its input', () => {
    const hostile = {
      ...latte,
      get variants(): unknown {
        throw new Error('boom')
      },
    }
    expect(validateProductInput(hostile, context).ok).toBe(false)
    const input = deepFreeze(structuredClone({ ...latte, variants: [{ label: ' S ', price: 100 }] }))
    const before = structuredClone(input)
    validateProductInput(input, context)
    expect(input).toEqual(before)
  })
})

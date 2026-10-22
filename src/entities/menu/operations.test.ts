import { describe, expect, it } from 'vitest'
import { deepFreeze } from '@/shared/lib/freeze'
import type { Menu, ModifierGroup, Product } from './menu'
import {
  hasVariants,
  lowestPrice,
  moveCategory,
  moveGroup,
  moveProduct,
  productsOf,
  removeCategory,
  removeGroup,
} from './operations'

const product = (id: string, categoryId: string, groupIds: string[] = []): Product => ({
  id,
  categoryId,
  name: id,
  description: '',
  price: 10000,
  variants: [],
  tags: [],
  available: true,
  image: null,
  groupIds,
})

const group = (id: string): ModifierGroup => ({ id, name: id, required: false, min: 0, max: 1, options: [{ id: `${id}o`, label: 'A', price: 0 }] })

// Frozen, so any change to the old menu would throw.
const menu: Menu = deepFreeze({
  categories: [
    { id: 'c1', name: 'Hot', visible: true },
    { id: 'c2', name: 'Iced', visible: true },
    { id: 'c3', name: 'Pastries', visible: true },
  ],
  products: [product('p1', 'c1', ['g2']), product('p2', 'c2'), product('p3', 'c1', ['g1', 'g2']), product('p4', 'c1'), product('p5', 'c2')],
  groups: [group('g1'), group('g2'), group('g3')],
})

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id)

describe('moveCategory and moveGroup', () => {
  it('swap a category with its neighbour', () => {
    expect(ids(moveCategory(menu, 'c2', -1).categories)).toEqual(['c2', 'c1', 'c3'])
    expect(ids(moveCategory(menu, 'c2', 1).categories)).toEqual(['c1', 'c3', 'c2'])
  })

  it('swap a group with its neighbour', () => {
    expect(ids(moveGroup(menu, 'g1', 1).groups)).toEqual(['g2', 'g1', 'g3'])
    expect(ids(moveGroup(menu, 'g3', -1).groups)).toEqual(['g1', 'g3', 'g2'])
  })

  it('leave the menu as it is at either end, for an unknown id and for a bad step', () => {
    expect(moveCategory(menu, 'c1', -1)).toBe(menu)
    expect(moveCategory(menu, 'c3', 1)).toBe(menu)
    expect(moveCategory(menu, 'nope', 1)).toBe(menu)
    expect(moveGroup(menu, 'g1', -1)).toBe(menu)
    expect(moveGroup(menu, 'g3', 1)).toBe(menu)
    expect(moveCategory(menu, 'c2', 2 as 1)).toBe(menu)
    expect(moveGroup(menu, 'g2', 0 as 1)).toBe(menu)
  })

  it('keep the other parts of the menu as they were', () => {
    const moved = moveCategory(menu, 'c2', 1)
    expect(moved.products).toBe(menu.products)
    expect(moved.groups).toBe(menu.groups)
  })
})

describe('moveProduct', () => {
  it('swaps a product with the next one of its own category, skipping the others', () => {
    expect(ids(moveProduct(menu, 'p3', -1).products)).toEqual(['p3', 'p2', 'p1', 'p4', 'p5'])
    expect(ids(moveProduct(menu, 'p1', 1).products)).toEqual(['p3', 'p2', 'p1', 'p4', 'p5'])
    expect(ids(moveProduct(menu, 'p2', 1).products)).toEqual(['p1', 'p5', 'p3', 'p4', 'p2'])
    expect(ids(moveProduct(menu, 'p4', -1).products)).toEqual(['p1', 'p2', 'p4', 'p3', 'p5'])
  })

  it('leaves the menu as it is for the first or last of a category, an unknown id or a bad step', () => {
    expect(moveProduct(menu, 'p1', -1)).toBe(menu)
    expect(moveProduct(menu, 'p4', 1)).toBe(menu)
    expect(moveProduct(menu, 'p5', 1)).toBe(menu)
    expect(moveProduct(menu, 'nope', 1)).toBe(menu)
    expect(moveProduct(menu, 'p3', 2 as 1)).toBe(menu)
  })
})

describe('removeCategory', () => {
  it('deletes the category and the products in it', () => {
    const next = removeCategory(menu, 'c1')
    expect(ids(next.categories)).toEqual(['c2', 'c3'])
    expect(ids(next.products)).toEqual(['p2', 'p5'])
    expect(next.groups).toBe(menu.groups)
  })

  it('deletes an empty category', () => {
    expect(ids(removeCategory(menu, 'c3').categories)).toEqual(['c1', 'c2'])
  })

  it('leaves the menu as it is for an unknown id', () => {
    expect(removeCategory(menu, 'nope')).toBe(menu)
  })
})

describe('removeGroup', () => {
  it('deletes the group and takes it off every product that offered it', () => {
    const next = removeGroup(menu, 'g2')
    expect(ids(next.groups)).toEqual(['g1', 'g3'])
    expect(next.products.map((item) => item.groupIds)).toEqual([[], [], ['g1'], [], []])
  })

  it('keeps the products that did not offer the group as they were', () => {
    const next = removeGroup(menu, 'g1')
    expect(next.products[0]).toBe(menu.products[0])
    expect(next.products[2]).not.toBe(menu.products[2])
  })

  it('leaves the menu as it is for an unknown id', () => {
    expect(removeGroup(menu, 'nope')).toBe(menu)
  })
})

describe('productsOf', () => {
  it('lists the products of a category in menu order', () => {
    expect(ids(productsOf(menu, 'c1'))).toEqual(['p1', 'p3', 'p4'])
    expect(productsOf(menu, 'c3')).toEqual([])
    expect(productsOf(menu, 'nope')).toEqual([])
  })
})

describe('hasVariants and lowestPrice', () => {
  const sized: Product = {
    ...product('p9', 'c1'),
    price: 14500,
    variants: [
      { id: 'v1', label: 'M', price: 16500 },
      { id: 'v2', label: 'S', price: 14500 },
    ],
  }

  it('tells a product with variants from one without', () => {
    expect(hasVariants(sized)).toBe(true)
    expect(hasVariants(product('p1', 'c1'))).toBe(false)
  })

  it('gives the lowest variant price, or the price when there are no variants', () => {
    expect(lowestPrice(sized)).toBe(14500)
    expect(lowestPrice({ price: 9000, variants: [] })).toBe(9000)
    expect(lowestPrice({ price: 0, variants: [{ price: 300 }, { price: 200 }] })).toBe(200)
  })
})

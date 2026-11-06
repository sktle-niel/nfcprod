import { describe, expect, it } from 'vitest'
import type { Product } from '@/entities/menu/menu'
import { cellsOf, columnsOf, NO_COLUMNS } from './columns'

const product = (sizes: [string, number][], price = 10000): Product => ({
  id: sizes.join(),
  categoryId: 'c',
  name: 'n',
  description: '',
  price,
  variants: sizes.map(([label, peso], index) => ({ id: String(index), label, price: peso * 100 })),
  tags: [],
  available: true,
  image: null,
  groupIds: [],
})

describe('columnsOf', () => {
  it('has none for a list with no sizes', () => {
    expect(columnsOf([product([]), product([])])).toEqual(NO_COLUMNS)
  })

  it('takes the order from the item with the most sizes, not the first', () => {
    const shorter = product([
      ['M', 120],
      ['L', 140],
    ])
    const longer = product([
      ['S', 100],
      ['M', 120],
      ['L', 140],
    ])
    expect(columnsOf([shorter, longer]).labels).toEqual(['S', 'M', 'L'])
  })

  it('makes every column as wide as the longest price of the list, one-price items too', () => {
    expect(columnsOf([product([['M', 90]]), product([], 125000)]).chars).toBe('₱1,250'.length)
  })

  const cases: [string, [string, number][]][] = [
    [
      'too many sizes',
      [
        ['XS', 1],
        ['S', 2],
        ['M', 3],
        ['L', 4],
      ],
    ],
    ['a long size name', [['Good for two', 1]]],
    ['a blank size name', [[' ', 1]]],
    [
      'a repeated size name',
      [
        ['M', 1],
        ['M', 2],
      ],
    ],
    [
      'prices that would squeeze the name out',
      [
        ['S', 10000],
        ['M', 20000],
        ['L', 30000],
      ],
    ],
  ]

  it.each(cases)('prints no columns for %s', (_, sizes) => {
    expect(columnsOf([product(sizes)])).toEqual(NO_COLUMNS)
  })
})

describe('cellsOf', () => {
  it('sets a one-price item in the last column', () => {
    expect(cellsOf(product([]), ['S', 'M'])).toEqual([null, { label: null, amount: '₱100' }])
  })

  it('leaves a size the item does not come in empty', () => {
    expect(cellsOf(product([['L', 140]]), ['S', 'L'])).toEqual([null, { label: 'L', amount: '₱140' }])
  })
})

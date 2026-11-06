import { describe, expect, it } from 'vitest'
import type { Product } from '@/entities/menu/menu'
import { sampleMenu } from '@/test/ownerFixtures'
import { columnOf, pricePlan, sizeColumns } from './columns'

const base = sampleMenu().products[0] as Product
const product = (labels: string[], price = 12000): Product => ({ ...base, price, variants: labels.map((label, index) => ({ id: `${label}-${index}`, label, price: price + index * 2000 })) })

describe('sizeColumns', () => {
  it('lists every size once, in menu order', () => {
    expect(sizeColumns([product(['S', 'M', 'L']), product(['S', 'M', 'L'])])).toEqual(['S', 'M', 'L'])
  })

  it('puts a size no earlier product had in its place between the others', () => {
    expect(sizeColumns([product(['M', 'L']), product(['S', 'M', 'L'])])).toEqual(['S', 'M', 'L'])
    expect(sizeColumns([product(['S', 'M']), product(['M', 'L'])])).toEqual(['S', 'M', 'L'])
    expect(sizeColumns([product(['Glass', 'Bottle']), product(['Glass', 'Carafe', 'Bottle'])])).toEqual(['Glass', 'Carafe', 'Bottle'])
  })

  it('takes a size in another case or with spaces as the same size', () => {
    expect(sizeColumns([product(['Small']), product(['small ']), product([' SMALL'])])).toEqual(['Small'])
  })

  it('has no columns for plain prices', () => {
    expect(sizeColumns([product([]), product([])])).toEqual([])
  })
})

describe('columnOf', () => {
  it('finds a size whatever its case', () => {
    expect(columnOf(['S', 'M', 'L'], ' m')).toBe(1)
    expect(columnOf(['S'], 'XL')).toBe(-1)
  })
})

describe('pricePlan', () => {
  it('goes across for up to three short sizes', () => {
    expect(pricePlan([product(['S', 'M', 'L'])])).toMatchObject({ columns: ['S', 'M', 'L'], stacked: false })
    expect(pricePlan([product(['Regular', 'Large'])])).toMatchObject({ columns: ['Regular', 'Large'], stacked: false })
  })

  it('stacks four sizes, a long size name, or a blank one', () => {
    expect(pricePlan([product(['XS', 'S', 'M', 'L'])])).toMatchObject({ columns: [], stacked: true })
    expect(pricePlan([product(['Half bottle', 'Bottle'])])).toMatchObject({ columns: [], stacked: true })
    expect(pricePlan([product(['', 'L'])])).toMatchObject({ columns: [], stacked: true })
  })

  it('stacks two sizes of a product under one name, or one price would be lost', () => {
    expect(pricePlan([product(['Hot', 'hot'])])).toMatchObject({ stacked: true })
  })

  it('is neither across nor stacked for plain prices', () => {
    expect(pricePlan([product([]), product([])])).toEqual({ columns: [], stacked: false, cell: 4, tight: false })
  })

  it('makes a column as wide as the widest price of the category, in digits', () => {
    expect(pricePlan([product(['S', 'L'], 9000), product([], 118000)]).cell).toBe('₱1,180'.length)
  })

  it('makes a column as wide as its head', () => {
    expect(pricePlan([product(['Medium'], 9000)]).cell).toBe(6)
  })

  it('calls the row tight when wide columns leave a name no room on a phone', () => {
    expect(pricePlan([product(['S', 'M', 'L'])]).tight).toBe(false)
    expect(pricePlan([product(['S', 'M', 'L'], 118000)]).tight).toBe(true)
    expect(pricePlan([product(['Regular', 'Large', 'Grande'])]).tight).toBe(true)
  })
})

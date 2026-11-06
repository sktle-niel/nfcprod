import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPES, type BusinessType } from '@/entities/business/business'
import { stockCategoryFor, stockPhoto, stockSrc, stockThumbSrc } from './stock'
import { STOCK_CATEGORIES, STOCK_PHOTOS, type StockCategory } from './stockPhotos'

// The first entry stands for any: nothing here depends on how many photos the library has.
const FIRST = STOCK_PHOTOS[0]

describe('the photo library lookups', () => {
  it('finds every photo of the table by its id', () => {
    for (const photo of STOCK_PHOTOS) expect(stockPhoto(photo.id), photo.id).toBe(photo)
  })

  it('builds the address of each photo and of its thumbnail from the table entry', () => {
    for (const photo of STOCK_PHOTOS) {
      expect(stockSrc(photo.id), photo.id).toBe(`/stock/${photo.file}.jpg`)
      expect(stockThumbSrc(photo.id), photo.id).toBe(`/stock/${photo.file}.thumb.jpg`)
    }
  })

  it.each<[string, unknown]>([
    ['a path out of the folder', '../../etc/passwd'],
    ['a real id followed by a path', `${FIRST.id}/../x`],
    ['a real id with a folder in front', `../${FIRST.id}`],
    ['a real id with a space after it', `${FIRST.id} `],
    ['a real id in capitals', FIRST.id.toUpperCase()],
    ['the file of a photo instead of its id', FIRST.file],
    ['an address', `https://evil.example/${FIRST.id}.jpg`],
    ['the empty text', ''],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a list holding a real id', [FIRST.id]],
    ['an object that reads as a real id', { toString: () => FIRST.id }],
    ['the prototype key __proto__', '__proto__'],
    ['the prototype key constructor', 'constructor'],
    ['the prototype key toString', 'toString'],
  ])('finds no photo for %s and builds no address', (_name, id) => {
    expect(stockPhoto(id)).toBeNull()
    expect(stockSrc(id)).toBeNull()
    expect(stockThumbSrc(id)).toBeNull()
  })
})

describe('the category of the library for a business', () => {
  it.each<[BusinessType, StockCategory]>([
    ['coffee', 'coffee'],
    ['milkTea', 'milktea'],
    ['casualDining', 'casual'],
    ['fineDining', 'fine'],
    ['bakery', 'bakery'],
    ['bar', 'bar'],
  ])('gives %s the category %s', (type, category) => {
    expect(stockCategoryFor([type])).toBe(category)
  })

  it('gives every kind of business a category of its own, one the library has', () => {
    const categories = BUSINESS_TYPES.map((type) => stockCategoryFor([type]))
    expect(new Set(categories).size).toBe(BUSINESS_TYPES.length)
    for (const category of categories) expect(STOCK_CATEGORIES).toContain(category)
  })

  it('goes by the first kind of a business that has several', () => {
    expect(stockCategoryFor(['bakery', 'coffee'])).toBe('bakery')
    expect(stockCategoryFor(['bar', 'fineDining', 'coffee'])).toBe('bar')
  })

  it('gives coffee to a business with no kind', () => {
    expect(stockCategoryFor([])).toBe('coffee')
    expect(stockCategoryFor(undefined)).toBe('coffee')
  })

  it.each(['', 'Bakery', 'milktea', 'toString', 'constructor', '__proto__'])('gives coffee, never a stray value, for the kind "%s"', (kind) => {
    expect(stockCategoryFor([kind as BusinessType])).toBe('coffee')
  })
})

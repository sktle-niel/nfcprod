import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPES } from '@/entities/business/business'
import { PLACEHOLDERS, placeholderKind, type PlaceholderKind } from './placeholders'

const kind = (product: string, category = '', types: Parameters<typeof placeholderKind>[1] = undefined) =>
  placeholderKind({ product, category }, types)

describe('placeholderKind', () => {
  it.each<[string, string, PlaceholderKind]>([
    ['Americano', 'Hot', 'cup'],
    ['Iced Caramel Macchiato', 'Iced', 'iced'],
    ['Mocha Frappe', 'Coffee', 'iced'],
    ['Brown Sugar Boba', 'Milk tea', 'boba'],
    ['Old Fashioned', 'Cocktails', 'cocktail'],
    ['Ube Macapuno Cake, whole', 'Cakes', 'slice'],
    ['Pandesal, 10 pieces', 'Breads', 'pastry'],
    ['Cheeseburger', 'Mains', 'burger'],
    ['Sinigang na Baboy', 'Mains', 'bowl'],
    ['Chicken Adobo', 'Hot meals', 'plate'],
    ['Crispy Pata', 'Mains', 'plate'],
    ['Ube Halo-halo', 'Desserts', 'iced'],
    ['Ube Ice Cream', 'Desserts', 'slice'],
  ])('reads %s in %s as %s', (product, category, expected) => {
    expect(kind(product, category)).toBe(expected)
  })

  it('reads the plural of a word, and a word inside a compound', () => {
    expect(kind('House special', 'Burgers')).toBe('burger')
    expect(kind('House special', 'Sandwiches')).toBe('burger')
    expect(kind('Bacon Double Hamburger')).toBe('burger')
  })

  it('does not read a word inside another word', () => {
    expect(kind('Garlic Rice')).toBe('bowl')
    expect(kind('Ginger Tea')).toBe('cup')
    expect(kind('Plain Rice', 'Sides', ['bar'])).toBe('bowl')
  })

  it('reads the name before the category, so a latte in a mixed category is still a cup', () => {
    expect(kind('Latte', 'Coffee and pastries')).toBe('cup')
    expect(kind('Ensaymada', 'Hot drinks and bread')).toBe('pastry')
  })

  it('reads the category when the name says nothing', () => {
    expect(kind('House special', 'Iced')).toBe('iced')
  })

  it('falls back to what the first kind of business serves, and to a plate with no type', () => {
    expect(kind('House special', 'Specials', ['coffee'])).toBe('cup')
    expect(kind('House special', 'Specials', ['milkTea', 'bakery'])).toBe('boba')
    expect(kind('House special', 'Specials', ['casualDining'])).toBe('plate')
    expect(kind('House special', 'Specials', ['bar'])).toBe('cocktail')
    expect(kind('House special', 'Specials', [])).toBe('plate')
    expect(kind('House special', 'Specials')).toBe('plate')
  })

  it('always gives a kind that has an illustration', () => {
    for (const type of BUSINESS_TYPES) expect(PLACEHOLDERS).toContain(kind('Something', 'Else', [type]))
  })
})

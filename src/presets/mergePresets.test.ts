import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPES, type BusinessType } from '@/entities/business/business'
import { LIMITS } from '@/entities/menu/menu'
import { validateProductInput } from '@/entities/menu/validateProduct'
import { styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import { deepFreeze } from '@/shared/lib/freeze'
import { mergePresets, PRESETS } from '.'
import { asCategories, groupsPassEditor } from './presets.testkit'

const { coffee, casualDining, bakery } = PRESETS

describe('mergePresets', () => {
  it('gives the default look and nothing else for no types', () => {
    expect(mergePresets([])).toEqual({ types: [], categories: [], theme: DEFAULT_THEME, groups: [], sizes: [], samples: [] })
  })

  it('gives a single preset as it is', () => {
    expect(mergePresets(['coffee'])).toEqual({
      types: ['coffee'],
      categories: coffee.categories,
      theme: coffee.theme,
      groups: coffee.groups,
      sizes: coffee.sizes,
      samples: coffee.samples,
    })
  })

  it('gives copies that can be changed without touching the presets', () => {
    const merged = mergePresets(['coffee'])
    merged.categories.push('Extra')
    merged.theme.primary = '#000000'
    merged.groups[0]?.options.push({ label: 'Triple', price: 1 })
    merged.samples[0]?.tags.push('new')
    expect(coffee.categories).not.toContain('Extra')
    expect(coffee.theme.primary).toBe(styleTheme('atelier', 'dark').primary)
    expect(coffee.groups[0]?.options).toHaveLength(2)
    expect(coffee.samples[0]?.tags).toEqual([])
    expect(mergePresets([]).theme).not.toBe(DEFAULT_THEME)
  })

  it('merges a coffee shop with casual dining: the drinks setup plus the meals setup', () => {
    const merged = mergePresets(['coffee', 'casualDining'])
    expect(merged.types).toEqual(['coffee', 'casualDining'])
    expect(merged.categories).toEqual(['Hot', 'Iced', 'Blended', 'Pastries', 'Appetizers', 'Mains', 'Sides', 'Drinks', 'Desserts'])
    expect(merged.theme).toEqual(coffee.theme)
    expect(merged.sizes).toEqual(['S', 'M', 'L'])
    expect(merged.groups.map((group) => group.name)).toEqual(['Extra shot', 'Syrups', 'Milk alternatives', 'Extras', 'Side orders'])
    expect(merged.samples).toEqual([...coffee.samples, ...casualDining.samples])
  })

  it('takes the look of the first type', () => {
    expect(mergePresets(['casualDining', 'coffee']).theme).toEqual(casualDining.theme)
    expect(mergePresets(['bar', 'fineDining']).theme).toEqual(PRESETS.bar.theme)
  })

  it('keeps each category once, in the order first seen', () => {
    expect(mergePresets(['coffee', 'bakery']).categories).toEqual(['Hot', 'Iced', 'Blended', 'Pastries', 'Breads', 'Cakes', 'Drinks'])
    expect(mergePresets(['bakery', 'coffee']).categories).toEqual(['Breads', 'Cakes', 'Pastries', 'Drinks', 'Hot', 'Iced', 'Blended'])
    expect(mergePresets(['casualDining', 'fineDining']).categories).toEqual([
      'Appetizers',
      'Mains',
      'Sides',
      'Drinks',
      'Desserts',
      'Starters',
      'Wine',
      'Tasting Menu',
    ])
  })

  it('merges groups of the same name into one, with the options of both', () => {
    const milk = (types: BusinessType[]) => mergePresets(types).groups.filter((group) => group.name === 'Milk alternatives')
    expect(milk(['coffee', 'milkTea'])).toEqual([
      {
        name: 'Milk alternatives',
        required: false,
        min: 0,
        max: 1,
        options: [
          { label: 'Oat milk', price: 4500 },
          { label: 'Almond milk', price: 4500 },
          { label: 'Soy milk', price: 3500 },
          { label: 'Coconut milk', price: 3000 },
        ],
      },
    ])
    expect(milk(['milkTea', 'coffee'])[0]?.options.map((option) => [option.label, option.price])).toEqual([
      ['Oat milk', 4000],
      ['Coconut milk', 3000],
      ['Almond milk', 4500],
      ['Soy milk', 3500],
    ])
  })

  it('gives the sizes as their ordered union', () => {
    expect(mergePresets(['coffee', 'milkTea']).sizes).toEqual(['S', 'M', 'L'])
    expect(mergePresets(['milkTea', 'coffee']).sizes).toEqual(['M', 'L', 'S'])
    expect(mergePresets(['bar', 'bakery']).sizes).toEqual([])
  })

  it('keeps one sample of the same name in the same category, the first one', () => {
    const merged = mergePresets(['casualDining', 'bakery'])
    const juices = merged.samples.filter((sample) => sample.name === 'Calamansi Juice')
    expect(juices).toEqual(casualDining.samples.filter((sample) => sample.name === 'Calamansi Juice'))
    expect(merged.samples).toHaveLength(casualDining.samples.length + bakery.samples.length - 1)
  })

  it('ignores a repeated type and one that does not exist', () => {
    expect(mergePresets(['coffee', 'coffee'])).toEqual(mergePresets(['coffee']))
    expect(mergePresets(['pizza' as BusinessType, 'bar'])).toEqual(mergePresets(['bar']))
    expect(mergePresets(['__proto__' as BusinessType, 'constructor' as BusinessType])).toEqual(mergePresets([]))
    expect(mergePresets('coffee' as unknown as BusinessType[])).toEqual(mergePresets([]))
  })

  it('merges all six into a menu the editors would accept', () => {
    const merged = mergePresets([...BUSINESS_TYPES])
    expect(merged.types).toEqual([...BUSINESS_TYPES])
    expect(merged.categories.length).toBeLessThanOrEqual(LIMITS.categories)
    expect(new Set(merged.categories.map((name) => name.toLowerCase())).size).toBe(merged.categories.length)
    expect(merged.groups.length).toBeLessThanOrEqual(LIMITS.groups)
    expect(groupsPassEditor(merged.groups)).toBe(true)
    const categories = asCategories(merged.categories)
    for (const sample of merged.samples) {
      const categoryId = categories.find((category) => category.name === sample.category)?.id
      expect(validateProductInput({ ...sample, categoryId }, { categories, groups: [] }).ok).toBe(true)
    }
  })

  it('gives the same result for the same types and leaves them as they were', () => {
    const types = deepFreeze<BusinessType[]>(['bar', 'coffee', 'milkTea'])
    expect(mergePresets(types)).toEqual(mergePresets(['bar', 'coffee', 'milkTea']))
    expect(types).toEqual(['bar', 'coffee', 'milkTea'])
  })
})

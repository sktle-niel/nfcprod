import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPES, type BusinessType } from '@/entities/business/business'
import { LIMITS, PRODUCT_TAGS, type Category } from '@/entities/menu/menu'
import { validateCategoryInput } from '@/entities/menu/validate'
import { validateProductInput } from '@/entities/menu/validateProduct'
import { contrastRatio } from '@/entities/theme/color'
import { toCssVars } from '@/entities/theme/cssVars'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { themeIssues, validateTheme } from '@/entities/theme/validate'
import { PRESETS, presetFor } from '.'
import { asCategories, groupsPassEditor } from './presets.testkit'

// PROJECT_FLOW section 4.
const CATEGORIES: Record<BusinessType, string[]> = {
  coffee: ['Hot', 'Iced', 'Blended', 'Pastries'],
  milkTea: ['Classics', 'Fruit Teas', 'Specials'],
  casualDining: ['Appetizers', 'Mains', 'Sides', 'Drinks', 'Desserts'],
  fineDining: ['Starters', 'Mains', 'Desserts', 'Wine', 'Tasting Menu'],
  bakery: ['Breads', 'Cakes', 'Pastries', 'Drinks'],
  bar: ['Cocktails', 'Beer', 'Wine', 'Pulutan'],
}
const SIZES: Record<BusinessType, string[]> = {
  coffee: ['S', 'M', 'L'],
  milkTea: ['M', 'L'],
  casualDining: [],
  fineDining: [],
  bakery: [],
  bar: [],
}

describe.each(BUSINESS_TYPES)('the %s preset', (type) => {
  const preset = PRESETS[type]

  it('is filed under its own type', () => {
    expect(preset.type).toBe(type)
    expect(presetFor(type)).toBe(preset)
  })

  it('starts with the categories and sizes of the project flow', () => {
    expect(preset.categories).toEqual(CATEGORIES[type])
    expect(preset.sizes).toEqual(SIZES[type])
  })

  it("starts from a ready-made style that suits it, in that style's own mode", () => {
    const { style } = preset.theme
    expect(STYLES[style].bestFor).toContain(type)
    expect(preset.theme).toEqual(styleTheme(style, STYLES[style].native))
  })

  it('has categories the category editor would accept', () => {
    const added: Category[] = []
    for (const name of preset.categories) {
      expect(validateCategoryInput({ name, visible: true }, added).ok).toBe(true)
      added.push({ id: `c${added.length}`, name, visible: true })
    }
  })

  it('has a valid palette with nothing hard to read', () => {
    expect(validateTheme(preset.theme)).toEqual({ ok: true, value: preset.theme })
    expect(themeIssues(preset.theme)).toEqual([])
    const vars = toCssVars(preset.theme)
    const read = (a: string, b: string) => contrastRatio(vars[a] ?? '', vars[b] ?? '')
    expect(read('--menu-muted', '--menu-bg')).toBeGreaterThanOrEqual(4.5)
    expect(read('--menu-muted', '--menu-surface')).toBeGreaterThanOrEqual(4.5)
    expect(read('--menu-text', '--menu-surface')).toBeGreaterThanOrEqual(4.5)
  })

  it('has add-on groups the group editor would accept', () => {
    expect(preset.groups.length).toBeGreaterThan(0)
    expect(groupsPassEditor(preset.groups)).toBe(true)
  })

  it('has 4 to 6 samples across at least two of its own categories, each one the product editor would accept', () => {
    expect(preset.samples.length).toBeGreaterThanOrEqual(4)
    expect(preset.samples.length).toBeLessThanOrEqual(6)
    expect(new Set(preset.samples.map((sample) => sample.category)).size).toBeGreaterThanOrEqual(2)
    const categories = asCategories(preset.categories)
    for (const sample of preset.samples) {
      expect(preset.categories).toContain(sample.category)
      expect(Number.isInteger(sample.price)).toBe(true)
      expect(sample.price).toBeGreaterThan(0)
      expect(sample.price).toBeLessThanOrEqual(LIMITS.priceMax)
      expect(sample.tags.every((tag) => (PRODUCT_TAGS as readonly string[]).includes(tag))).toBe(true)
      const categoryId = categories.find((category) => category.name === sample.category)?.id
      const result = validateProductInput({ ...sample, categoryId }, { categories, groups: [] })
      // Already clean: the editor would store it exactly as written.
      expect(result.ok && [result.value.name, result.value.description]).toEqual([sample.name, sample.description])
    }
  })

  it('is frozen, so nobody can change it by mistake', () => {
    expect(Object.isFrozen(preset)).toBe(true)
    expect(Object.isFrozen(preset.theme)).toBe(true)
    expect(Object.isFrozen(preset.samples[0])).toBe(true)
  })
})

describe('the presets', () => {
  const groupNames = (type: BusinessType) => PRESETS[type].groups.map((group) => group.name)
  const labels = (type: BusinessType, name: string) =>
    PRESETS[type].groups.find((group) => group.name === name)?.options.map((option) => option.label) ?? []

  it('give fine dining a serif font and a bar the dark mode', () => {
    expect(['instrumentSerif', 'playfair', 'dmSerif']).toContain(PRESETS.fineDining.theme.font)
    expect(PRESETS.bar.theme.mode).toBe('dark')
  })

  it('give each kind of business a style of its own, so the choice shows from the first minute', () => {
    const styles = BUSINESS_TYPES.map((type) => PRESETS[type].theme.style)
    expect(new Set(styles).size).toBe(BUSINESS_TYPES.length)
  })

  it('give each kind of business its own palette', () => {
    const palettes = BUSINESS_TYPES.map((type) => PRESETS[type].theme.primary)
    expect(new Set(palettes).size).toBe(BUSINESS_TYPES.length)
  })

  it('give a coffee shop shots, syrups and other milks', () => {
    expect(groupNames('coffee')).toEqual(['Extra shot', 'Syrups', 'Milk alternatives'])
  })

  it('make a milk tea customer pick sugar and ice, with toppings such as pearls and jelly', () => {
    const required = PRESETS.milkTea.groups.filter((group) => group.required).map((group) => group.name)
    expect(required).toEqual(['Sugar level', 'Ice level'])
    expect(labels('milkTea', 'Toppings')).toEqual(expect.arrayContaining(['Pearls', 'Coffee jelly', 'Grass jelly']))
  })

  it('give casual dining add-ons and sides', () => {
    expect(groupNames('casualDining')).toEqual(['Extras', 'Side orders'])
  })

  it('refuse a type that does not exist', () => {
    expect(() => presetFor('pizza' as BusinessType)).toThrow(RangeError)
    expect(() => presetFor('__proto__' as BusinessType)).toThrow(RangeError)
  })
})

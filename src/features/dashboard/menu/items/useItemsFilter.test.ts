import { describe, expect, it } from 'vitest'
import { sampleMenu } from '@/test/ownerFixtures'
import { filterMenu } from './useItemsFilter'

describe('filterMenu', () => {
  it('keeps everything without a search, empty categories included', () => {
    const menu = sampleMenu()
    menu.categories.push({ id: 'cat-new', name: 'New', visible: true })
    const view = filterMenu(menu, '   ')
    expect(view.searching).toBe(false)
    expect(view.sections.map((s) => s.category.name)).toEqual(['Hot', 'Iced', 'New'])
    expect(view.matches).toBe(4)
    expect(view.total).toBe(4)
  })

  it('keeps only the matching items and the categories that hold them', () => {
    const view = filterMenu(sampleMenu(), 'ICED')
    expect(view.sections.map((s) => s.category.name)).toEqual(['Iced'])
    expect(view.sections[0]?.products.map((p) => p.name)).toEqual(['Iced Caramel Macchiato'])
    expect(view.sections[0]?.total).toBe(2)
    expect(view.matches).toBe(1)
  })

  it('searches item names only, not categories or descriptions', () => {
    expect(filterMenu(sampleMenu(), 'hot').sections).toEqual([])
    expect(filterMenu(sampleMenu(), 'espresso').matches).toBe(0)
  })

  it('treats a search with regex characters as plain text', () => {
    expect(filterMenu(sampleMenu(), '.*').matches).toBe(0)
  })
})

import type { BusinessType } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { startMenu } from '@/data/ownerMenu'
import { mergePresets } from '@/presets'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'
import { visibleSections } from '@/shared/menu/sections'

/** What a style thumbnail draws of the business: its name, tagline, logo and types, with every theme given on top. */
export type ThumbBusiness = Omit<MenuViewBusiness, 'theme'>

const CATEGORIES = 2
const PRODUCTS = 2

/** A menu with no item yet still shows the styles on something: the samples of the business types. */
function sampleMenu(types: readonly BusinessType[]): Menu {
  let count = 0
  return startMenu(mergePresets([...types]), true, () => `thumb-${(count += 1)}`)
}

/**
 * The start of the owner's menu for a thumbnail: the first two categories that show, with their first two items. The add-on
 * groups stay, so an item still says it has add-ons. A menu with nothing to show takes the samples of the business types.
 */
export function thumbMenu(menu: Menu, types: readonly BusinessType[] = []): Menu {
  const sections = visibleSections(menu).slice(0, CATEGORIES)
  if (sections.length === 0) return types.length > 0 ? thumbMenu(sampleMenu(types)) : menu
  return {
    categories: sections.map((section) => section.category),
    products: sections.flatMap((section) => section.products.slice(0, PRODUCTS)),
    groups: menu.groups,
  }
}

/** The top of the menu only: the contact details and links stay out of a thumbnail, they are too small to read there. */
export function thumbBusiness({ name, tagline, logo, types }: Pick<MenuViewBusiness, 'name' | 'tagline' | 'logo' | 'types'>): ThumbBusiness {
  return {
    name,
    tagline,
    logo,
    phone: '',
    address: '',
    hours: '',
    social: { facebook: '', instagram: '', tiktok: '', website: '' },
    types,
  }
}

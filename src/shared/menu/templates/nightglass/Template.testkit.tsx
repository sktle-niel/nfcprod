import { render } from '@testing-library/react'
import type { Menu, Product } from '@/entities/menu/menu'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import type { MenuViewBusiness } from '../../MenuView'
import { spotlightOf, visibleSections } from '../../sections'
import type { TemplateProps } from '../types'
import { Template } from './Template'

/** The sample business: Kape Kanto, a coffee shop with a phone, an address, hours and two social links. */
export const business = (patch: Partial<MenuViewBusiness> = {}): MenuViewBusiness => ({ ...sampleBusiness(), ...patch })

/** The sample menu with some of its products changed (by id), for the cases a test needs. */
export function menuWith(patches: Record<string, Partial<Product>> = {}, rest: Partial<Menu> = {}): Menu {
  const menu = sampleMenu(rest)
  return { ...menu, products: menu.products.map((product) => ({ ...product, ...patches[product.id] })) }
}

/** The props `MenuView` hands a template for a menu, in the public page's shape unless the patch says otherwise. */
export function propsFor(menu: Menu = sampleMenu(), patch: Partial<TemplateProps> = {}, biz: MenuViewBusiness = business()): TemplateProps {
  const sections = visibleSections(menu)
  return {
    business: biz,
    sections,
    spotlight: spotlightOf(sections),
    groups: menu.groups,
    layout: 'grid',
    tags: { name: 'h1', category: 'h2', product: 'h3' },
    interactive: true,
    idOf: (index) => `ng-section-${index}`,
    // The page checks a picture before it hands it over (`pictureSrc`); a test hands the address as it is.
    photoOf: (product) => product.image,
    placeholderOf: () => 'cup',
    ...patch,
  }
}

/** Draws the template directly (not through the lazy registry), as `MenuView` does. */
export function renderTemplate(menu: Menu = sampleMenu(), patch: Partial<TemplateProps> = {}, biz: MenuViewBusiness = business()) {
  return render(<Template {...propsFor(menu, patch, biz)} />)
}

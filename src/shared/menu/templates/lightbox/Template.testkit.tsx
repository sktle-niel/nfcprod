import { render } from '@testing-library/react'
import type { Menu, Product } from '@/entities/menu/menu'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import { visibleSections } from '../../sections'
import type { TemplateProps } from '../types'
import { Template } from './Template'

/**
 * The props `MenuView` gives a template, for the sample business and menu of the owner fixtures (Hot: Americano, Spanish Latte;
 * Iced: Iced Caramel Macchiato, sold out, and Cold Brew; the Latte and the Macchiato offer add-ons, only the Latte has a photo).
 * `menu` is what to draw; every other key replaces a prop. `spotlight` and `placeholderOf` are required props Lightbox does not use.
 */
export function propsOf({ menu = sampleMenu(), ...patch }: Partial<TemplateProps> & { menu?: Menu } = {}): TemplateProps {
  return {
    business: sampleBusiness(),
    sections: visibleSections(menu),
    spotlight: null,
    groups: menu.groups,
    layout: 'list',
    tags: { name: 'h1', category: 'h2', product: 'h3' },
    interactive: true,
    idOf: (index) => `lightbox-section-${index}`,
    photoOf: (product) => product.image,
    placeholderOf: () => 'cup',
    ...patch,
  }
}

/** Draws the page directly (not through the lazy registry), with the props above. */
export function renderPage(patch: Parameters<typeof propsOf>[0] = {}) {
  return render(<Template {...propsOf(patch)} />)
}

/** The sample menu with its products replaced (the categories are Hot, `cat-hot`, and Iced, `cat-iced`). */
export const menuWith = (products: Product[]): Menu => ({ ...sampleMenu(), products })

/** A plain product: no sizes, no tags, no picture, available. */
export const plainProduct = (id: string, categoryId: string, patch: Partial<Product> = {}): Product => ({
  id,
  categoryId,
  name: id,
  description: '',
  price: 10000,
  variants: [],
  tags: [],
  available: true,
  image: null,
  groupIds: [],
  ...patch,
})

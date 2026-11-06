import type { Category, ModifierGroup, Product } from '@/entities/menu/menu'
import type { Layout } from '@/entities/theme/theme'
import type { MenuViewBusiness } from '../MenuView'
import type { PlaceholderKind } from '../photo/placeholders'
import type { Section } from '../sections'

/**
 * What `MenuView` hands a page template: the business, the menu as the customer sees it, and the small helpers that keep every
 * template honest (the checked picture of a product, the heading levels, the ids the category links point to). A template draws
 * the whole page inside the menu's root: the header, how the categories are reached, the products, the contact lines. It paints
 * with the --menu-* variables only (see menuStyleRules.test.ts) and is sized by the root's width (container queries).
 */
export type TemplateProps = {
  business: MenuViewBusiness
  /** The visible categories that have products, each with its products, in menu order. Never empty: the page shows its own empty state otherwise. */
  sections: Section[]
  /** The first available best seller, for templates that feature one. */
  spotlight: { product: Product; category: Category } | null
  /** The add-on groups of the menu. A product's `groupIds` point into this list; an id that is not in it is skipped. */
  groups: ModifierGroup[]
  /** The owner's choice of columns: Grid puts items side by side where the template can, List stacks them. */
  layout: Layout
  /** The tags of the business name, the categories and the products: they step down one level at a time. */
  tags: { name: 'h1' | 'h2'; category: 'h2' | 'h3'; product: 'h3' | 'h4' }
  /** False in the Design preview: links are plain text, inputs and buttons are not tab stops, nothing is a landmark. */
  interactive: boolean
  /** The id of the section of the category at `index`: the target of its link. */
  idOf: (index: number) => string
  /** The picture of a product, already checked by `pictureSrc`, or null. */
  photoOf: (product: Product) => string | null
  /** The drawn illustration for a product without a picture. */
  placeholderOf: (product: Product, category: Category) => PlaceholderKind
}

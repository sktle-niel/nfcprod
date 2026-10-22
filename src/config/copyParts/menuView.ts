import type { ProductTag } from '@/entities/menu/menu'

/** Words on the menu as a customer sees it (src/shared/menu/MenuView). Owned by the menuview agent. */
export const menuViewCopy = {
  empty: 'No items on this menu yet.',
  soldOut: 'Sold out',
  addOnsAvailable: 'Add-ons available',
  /** `{price}` is the lowest variant price. */
  from: 'From {price}',
  categoriesLabel: 'Menu categories',
  previewLabel: 'Menu preview',
  tags: {
    bestSeller: 'Best seller',
    new: 'New',
    spicy: 'Spicy',
    vegan: 'Vegan',
    vegetarian: 'Vegetarian',
    glutenFree: 'Gluten-free',
  } satisfies Record<ProductTag, string>,
  footer: {
    phone: 'Call us',
    address: 'Find us',
    hours: 'Hours',
    social: 'Follow us',
  },
  social: {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Website',
  },
} as const

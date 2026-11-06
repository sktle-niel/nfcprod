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
  /** Words the page templates share (src/shared/menu/templates). A template keeps its own words next to its own files. */
  template: {
    search: {
      label: 'Search the menu',
      placeholder: 'Search the menu',
      clear: 'Clear the search',
      /** `{query}` is what was typed. */
      none: 'Nothing on this menu matches "{query}".',
      /** Read aloud as the list changes. `{n}` is how many items match. */
      count: { one: '{n} item found', many: '{n} items found' },
    },
    more: 'More',
    less: 'Less',
    sizes: 'Sizes',
    addOns: 'Add-ons',
    free: 'Free',
    loading: 'Loading the menu',
    failed: 'This page could not load its design, so the menu is shown plain.',
    reload: 'Reload',
    /** The slim navigation at the top of a template. */
    siteNav: { label: 'On this page', menu: 'Menu', visit: 'Visit' },
    /** The Visit section. Its fact labels are the `footer` words above. */
    visit: {
      heading: 'Visit',
      directions: 'Directions',
      /** Read aloud in place of the short link text. */
      directionsLabel: 'Directions, opens in a new tab',
    },
  },
  social: {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Website',
  },
} as const

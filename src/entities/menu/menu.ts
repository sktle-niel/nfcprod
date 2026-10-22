/** Labels a product can carry. Shown as small chips on the menu. */
export const PRODUCT_TAGS = ['bestSeller', 'new', 'spicy', 'vegan', 'vegetarian', 'glutenFree'] as const
export type ProductTag = (typeof PRODUCT_TAGS)[number]

/** Room for the text and the lists of a menu. A typo or a paste gone wrong stops here; real menus fit well inside. */
export const LIMITS = {
  categories: 40,
  categoryName: 40,
  productName: 80,
  description: 280,
  variants: 8,
  variantLabel: 30,
  groups: 30,
  groupName: 40,
  options: 20,
  optionLabel: 40,
  /** ₱100,000 in centavos: wide, it only stops a run-away zero. Prices are never negative. */
  priceMax: 10_000_000,
} as const

/** One size or option of a product, with its own price. Prices are whole centavos, like everywhere else. */
export type Variant = { id: string; label: string; price: number }

/** One choice inside an add-on group, with what it adds to the price (0 for free). */
export type ModifierOption = { id: string; label: string; price: number }

/** A set of add-ons a product can offer, for example "Milk" or "Extras". Many products share one group. */
export type ModifierGroup = {
  id: string
  name: string
  /** True when the customer has to pick at least one. */
  required: boolean
  /** How many options the customer picks: from `min` to `max`. `min` is 0 or more, `max` is at least 1 and at most the options. */
  min: number
  max: number
  options: ModifierOption[]
}

export type Product = {
  id: string
  categoryId: string
  name: string
  description: string
  /** Integer centavos. With variants it is the lowest variant price (shown as "from"). */
  price: number
  variants: Variant[]
  tags: ProductTag[]
  /** False means sold out: the menu still lists it, marked. */
  available: boolean
  /** A picture the owner uploaded, as an address the browser can show. Null means none. */
  image: string | null
  /** The add-on groups this product offers, by id. */
  groupIds: string[]
}

export type Category = { id: string; name: string; visible: boolean }

/** A whole menu. The order of each array is the order on the public page (a product sits in the order of its category). */
export type Menu = { categories: Category[]; products: Product[]; groups: ModifierGroup[] }

/** What the owner types for a category. No id means a new one. */
export type CategoryInput = { id?: string; name: string; visible: boolean }

/** What the owner types for a product. No id means a new one. With variants, the price is taken from them. */
export type ProductInput = {
  id?: string
  categoryId: string
  name: string
  description: string
  price: number
  variants: { id?: string; label: string; price: number }[]
  tags: ProductTag[]
  available: boolean
  image: string | null
  groupIds: string[]
}

/** What the owner types for an add-on group. No id means a new one. */
export type GroupInput = {
  id?: string
  name: string
  required: boolean
  min: number
  max: number
  options: { id?: string; label: string; price: number }[]
}

/** A picture the owner may upload: these types only (no SVG, which can carry script), and at most 4 MB. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageType = (typeof IMAGE_TYPES)[number]
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024

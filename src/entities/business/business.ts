import type { Theme } from '@/entities/theme/theme'

/** The kinds of business a preset exists for. An owner picks one or more (a hybrid). */
export const BUSINESS_TYPES = ['coffee', 'milkTea', 'casualDining', 'fineDining', 'bakery', 'bar'] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]

/** Where the business is online. An empty string means none. Links are https only. */
export type SocialLinks = { facebook: string; instagram: string; tiktok: string; website: string }

/** The owner's business as the dashboard reads and edits it. */
export type Business = {
  id: string
  /** Lowercase letters, digits and hyphens. It is in the URL written on the NFC card, so it must not change lightly. */
  slug: string
  name: string
  tagline: string
  types: BusinessType[]
  /** A picture the owner uploaded, as an address the browser can show. Null means none. */
  logo: string | null
  phone: string
  address: string
  /** Free text, a few short lines. */
  hours: string
  social: SocialLinks
  theme: Theme
  /** True when the owner put the menu on its public link. A plan that ended pauses it whatever this says (`isMenuLive`). */
  published: boolean
}

/** What the owner can change on the Design page. The slug has its own call: it is on the card. */
export type BusinessPatch = Partial<Pick<Business, 'name' | 'tagline' | 'logo' | 'phone' | 'address' | 'hours' | 'social' | 'theme'>>

/** What the setup wizard asks for. The presets of `types` decide the first categories, add-ons and look. */
export type NewBusinessInput = {
  name: string
  slug: string
  types: BusinessType[]
  /** Fill the menu with a few example items from the presets, for the owner to edit or delete. */
  samples: boolean
}

/** Where a slug stands for this owner. `yours` is the one the business already has. */
export type SlugStatus = 'available' | 'yours' | 'taken' | 'invalid' | 'reserved'

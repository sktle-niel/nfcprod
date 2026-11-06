import { fill } from '@/shared/lib/fill'

/** The words that belong to the Marmalade page alone. The ones every page shares (sold out, tags, sizes) come from `copy.menu.view`. */
export const words = {
  /** The plain control that opens the add-ons of a product. */
  addOns: 'Add-ons',
  /** Its name for a screen reader. `{name}` is the product. */
  addOnsOf: 'Add-ons for {name}',
} as const

/** Puts `name` into a template in one pass, so a name that holds "$&" or "$1" stays as it is. */
export const withName = (template: string, name: string): string => fill(template, { name })

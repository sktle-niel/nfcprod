import { MAX_QUANTITY, PLATFORMS, type Platform } from '@/entities/order/order'

/** What the customer typed for each chosen platform. A platform that is not chosen has no entry. */
export type Quantities = Partial<Record<Platform, string>>

/** Whole numbers only, so an empty or half-typed field counts as no cards until it is fixed. */
export function toQuantity(value: string | undefined): number {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : 0
}

/** Keeps a stepped quantity between 1 and MAX_QUANTITY. */
export function clampQuantity(value: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, value))
}

/** The chosen platforms, in the order the form shows them. */
export function chosenPlatforms(quantities: Quantities): Platform[] {
  return PLATFORMS.filter((platform) => quantities[platform] !== undefined)
}

/** How many cards the customer has asked for so far. */
export function cardTotal(quantities: Quantities): number {
  return chosenPlatforms(quantities).reduce((sum, platform) => sum + toQuantity(quantities[platform]), 0)
}

import { cleanText } from '@/shared/lib/text'

/** The three offers the landing page sells. */
export const OFFER_KEYS = ['card', 'month', 'year'] as const
export type OfferKey = (typeof OFFER_KEYS)[number]

/** One offer as the admin sets it. The server charges from its own copy, never from the browser. */
export type Offer = {
  /** Regular price in integer centavos. */
  price: number
  /** Percent off, 0 for none. */
  discount: number
  /** What the card lists with check marks. */
  perks: string[]
}

/** card: one NFC review card. month / year: the NFC + Website package by the month or by the year. */
export type Pricing = Record<OfferKey, Offer>

/** ₱1 to ₱100,000. Wide on purpose: it only stops typos like an extra zero running off. */
export const PRICE_MIN = 100
export const PRICE_MAX = 10_000_000
/** A discount above this is almost surely a typo. */
export const DISCOUNT_MAX = 90
export const PERKS_MAX = 8
export const PERK_MIN = 2
export const PERK_MAX = 80

export type FieldError = 'required' | 'invalid' | 'range' | 'yearTooHigh' | 'tooShort' | 'tooLong'

export type OfferErrors = {
  price?: FieldError
  discount?: FieldError
  /** One entry per perk, null where the perk is fine. */
  perks?: (FieldError | null)[]
  /** About the list as a whole. */
  list?: 'tooMany'
}
export type PricingErrors = Partial<Record<OfferKey, OfferErrors>>

/** What the customer pays: the price less the discount, to the nearest whole peso. */
export function salePrice({ price, discount }: Pick<Offer, 'price' | 'discount'>): number {
  return Math.round((price * (100 - discount)) / 10_000) * 100
}

/** Whole pesos as typed ("379", "3,999", "₱ 479") to centavos, or null when it is not a whole number of pesos. */
export function parsePesos(value: string): number | null {
  const digits = value.replace(/[\s,₱]/g, '')
  return /^\d{1,9}$/.test(digits) ? Number(digits) * 100 : null
}

/** A discount as typed ("20", "20%"). Empty means no discount. Null when it is not a whole number. */
export function parsePercent(value: string): number | null {
  const digits = value.replace(/[\s%]/g, '')
  if (digits === '') return 0
  return /^\d{1,3}$/.test(digits) ? Number(digits) : null
}

function inRange(centavos: number): boolean {
  return Number.isInteger(centavos) && centavos >= PRICE_MIN && centavos <= PRICE_MAX
}

function checkPerk(text: string): FieldError | null {
  if (text === '') return 'required'
  if (cleanText(text) !== text) return 'invalid'
  if (text.length < PERK_MIN) return 'tooShort'
  return text.length > PERK_MAX ? 'tooLong' : null
}

function checkOffer(offer: Offer): OfferErrors {
  const errors: OfferErrors = {}
  if (!inRange(offer.price)) errors.price = 'range'
  if (!Number.isInteger(offer.discount) || offer.discount < 0 || offer.discount > DISCOUNT_MAX) errors.discount = 'range'
  if (offer.perks.length > PERKS_MAX) errors.list = 'tooMany'
  const perks = offer.perks.map(checkPerk)
  if (perks.some((error) => error !== null)) errors.perks = perks
  return errors
}

export function isClean(errors: PricingErrors): boolean {
  return Object.values(errors).every((offer) => Object.keys(offer).length === 0)
}

/** Checks a full set of offers. The server must repeat this. */
export function checkPricing(pricing: Pricing): PricingErrors {
  const errors: PricingErrors = {}
  for (const key of OFFER_KEYS) {
    const offer = checkOffer(pricing[key])
    if (Object.keys(offer).length > 0) errors[key] = offer
  }
  // A year must not cost more than twelve months, or the annual plan would be a trap.
  if (!errors.month?.price && !errors.year?.price && pricing.year.price > pricing.month.price * 12) {
    errors.year = { ...errors.year, price: 'yearTooHigh' }
  }
  return errors
}

/** One offer of the admin's form: whole pesos, a percent, and the perks as typed. */
export type RawOffer = { price: string; discount: string; perks: readonly string[] }

/** Reads the admin's form into offers, or says what is wrong with each field. */
export function validatePricing(raw: Record<OfferKey, RawOffer>): { ok: true; pricing: Pricing } | { ok: false; errors: PricingErrors } {
  const errors: PricingErrors = {}
  const pricing = {} as Pricing
  for (const key of OFFER_KEYS) {
    const { price, discount, perks } = raw[key]
    const offer: OfferErrors = {}
    const pesos = parsePesos(price)
    const percent = parsePercent(discount)
    if (price.trim() === '') offer.price = 'required'
    else if (pesos === null) offer.price = 'invalid'
    if (percent === null) offer.discount = 'invalid'
    if (Object.keys(offer).length > 0) errors[key] = offer
    pricing[key] = { price: pesos ?? 0, discount: percent ?? 0, perks: perks.map(cleanText) }
  }
  if (!isClean(errors)) return { ok: false, errors }
  const checked = checkPricing(pricing)
  return isClean(checked) ? { ok: true, pricing } : { ok: false, errors: checked }
}

function parseOffer(data: unknown): Offer | null {
  if (typeof data !== 'object' || data === null) return null
  const { price, discount, perks } = data as Record<string, unknown>
  if (typeof price !== 'number' || typeof discount !== 'number' || !Array.isArray(perks)) return null
  if (!perks.every((perk): perk is string => typeof perk === 'string')) return null
  return { price, discount, perks }
}

/** Offers that came from outside (an API), or null when they are not a usable set. */
export function parsePricing(data: unknown): Pricing | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>
  const pricing = {} as Pricing
  for (const key of OFFER_KEYS) {
    const offer = parseOffer(record[key])
    if (!offer) return null
    pricing[key] = offer
  }
  return isClean(checkPricing(pricing)) ? pricing : null
}

/** What paying by the year gives against twelve single months, at the prices customers pay. All in centavos. */
export function yearSaving({ month, year }: Pick<Pricing, 'month' | 'year'>) {
  const fullYear = salePrice(month) * 12
  const yearly = salePrice(year)
  const saving = fullYear - yearly
  return {
    saving,
    /** Rounded down, so the page never promises more than it gives. */
    percent: fullYear > 0 ? Math.floor((saving / fullYear) * 100) : 0,
    /** The year spread over twelve months, to the nearest peso. */
    perMonth: Math.round(yearly / 12 / 100) * 100,
  }
}

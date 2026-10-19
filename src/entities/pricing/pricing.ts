/** What the platform sells, in integer centavos. The admin sets them; the server charges from its own copy. */
export type Prices = {
  /** One NFC review card. */
  card: number
  /** NFC + Website package, paid every month. */
  month: number
  /** NFC + Website package, paid once a year. */
  year: number
}

export const PRICE_KEYS = ['card', 'month', 'year'] as const
export type PriceKey = (typeof PRICE_KEYS)[number]

/** ₱1 to ₱100,000. Wide on purpose: it only stops typos like an extra zero running off. */
export const PRICE_MIN = 100
export const PRICE_MAX = 10_000_000

export type PriceError = 'required' | 'invalid' | 'range' | 'yearTooHigh'
export type PriceErrors = Partial<Record<PriceKey, PriceError>>

/** Whole pesos as typed ("379", "3,999", "₱ 479") to centavos, or null when it is not a whole number of pesos. */
export function parsePesos(value: string): number | null {
  const digits = value.replace(/[\s,₱]/g, '')
  return /^\d{1,9}$/.test(digits) ? Number(digits) * 100 : null
}

function inRange(centavos: number): boolean {
  return Number.isInteger(centavos) && centavos >= PRICE_MIN && centavos <= PRICE_MAX
}

/** A year must not cost more than twelve months, or the annual plan would be a trap. */
function checkYear(prices: Prices): PriceError | null {
  return prices.year > prices.month * 12 ? 'yearTooHigh' : null
}

/** Checks a full set of prices. The server must repeat this. */
export function checkPrices(prices: Prices): PriceErrors {
  const errors: PriceErrors = {}
  for (const key of PRICE_KEYS) if (!inRange(prices[key])) errors[key] = 'range'
  const year = errors.year || errors.month ? null : checkYear(prices)
  if (year) errors.year = year
  return errors
}

/** Reads the admin's form. Each value is whole pesos as typed. */
export function validatePrices(raw: Record<PriceKey, string>): { ok: true; prices: Prices } | { ok: false; errors: PriceErrors } {
  const errors: PriceErrors = {}
  const parsed: Partial<Prices> = {}
  for (const key of PRICE_KEYS) {
    if (raw[key].trim() === '') errors[key] = 'required'
    else {
      const value = parsePesos(raw[key])
      if (value === null) errors[key] = 'invalid'
      else parsed[key] = value
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const prices = parsed as Prices
  const checked = checkPrices(prices)
  return Object.keys(checked).length > 0 ? { ok: false, errors: checked } : { ok: true, prices }
}

/** Prices that came from outside (an API), or null when they are not a usable set. */
export function parsePrices(data: unknown): Prices | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>
  const prices = { card: record['card'], month: record['month'], year: record['year'] }
  if (!PRICE_KEYS.every((key) => typeof prices[key] === 'number')) return null
  const typed = prices as Prices
  return Object.keys(checkPrices(typed)).length === 0 ? typed : null
}

/** What paying by the year gives against twelve single months. All amounts in centavos. */
export function yearSaving({ month, year }: Pick<Prices, 'month' | 'year'>) {
  const fullYear = month * 12
  const saving = fullYear - year
  return {
    saving,
    /** Rounded down, so the page never promises more than it gives. */
    percent: fullYear > 0 ? Math.floor((saving / fullYear) * 100) : 0,
    /** The year spread over twelve months, to the nearest peso. */
    perMonth: Math.round(year / 12 / 100) * 100,
  }
}

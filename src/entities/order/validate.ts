import { cleanText, PERSON_NAME } from '@/shared/lib/text'
import { MAX_QUANTITY, PLATFORMS, type Order, type Platform, type RawOrder } from './order'

export { cleanText }

export type FieldName =
  | 'platforms'
  | 'fullName'
  | 'phone'
  | 'province'
  | 'city'
  | 'barangay'
  | 'street'
  | 'landmark'
  | 'consent'

export type FieldError = 'required' | 'tooShort' | 'tooLong' | 'invalid' | 'quantity'

export type ValidationResult =
  | { ok: true; order: Order }
  | { ok: false; errors: Partial<Record<FieldName, FieldError>> }

// Names use PERSON_NAME. Places and addresses also allow digits and , # ( ) / &.
const PLACE = /^[\p{L}\p{M}\p{N} .,#'’()/&-]+$/u
const LANDMARK = /^[\p{L}\p{M}\p{N} .,#'’()/&:;-]+$/u

/** Accepts 09XXXXXXXXX, 9XXXXXXXXX, 639XXXXXXXXX and +639XXXXXXXXX. Returns +639XXXXXXXXX or null. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[\s\-().]/g, '')
  if (!/^(?:\+63|63|0)?9\d{9}$/.test(digits)) return null
  return `+63${digits.slice(-10)}`
}

type TextRule = { min: number; max: number; pattern: RegExp }

function checkText(value: string, rule: TextRule): FieldError | null {
  if (value.length === 0) return 'required'
  if (value.length < rule.min) return 'tooShort'
  if (value.length > rule.max) return 'tooLong'
  if (!rule.pattern.test(value)) return 'invalid'
  return null
}

/** What a province, city or barangay name must look like. Place lists from outside are cleaned until they fit this. */
export const PLACE_NAME = { min: 2, max: 60, pattern: PLACE } satisfies TextRule

const RULES = {
  fullName: { min: 2, max: 80, pattern: PERSON_NAME },
  province: { min: 2, max: 60, pattern: PLACE },
  city: { min: 2, max: 60, pattern: PLACE },
  barangay: { min: 2, max: 60, pattern: PLACE },
  street: { min: 3, max: 120, pattern: PLACE },
  landmark: { min: 8, max: 200, pattern: LANDMARK },
} satisfies Record<string, TextRule>

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value)
}

function isQuantity(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_QUANTITY
}

/** At least one card, each platform once, and a whole quantity from 1 to MAX_QUANTITY for each. */
function checkItems(items: RawOrder['items']): FieldError | null {
  if (items.length === 0) return 'required'
  const platforms = items.map((item) => item.platform)
  if (!platforms.every(isPlatform) || new Set(platforms).size !== platforms.length) return 'invalid'
  if (!items.every((item) => isQuantity(item.quantity))) return 'quantity'
  return null
}

/** The server must repeat these checks. This only gives the customer fast feedback. */
export function validateOrder(raw: RawOrder): ValidationResult {
  const errors: Partial<Record<FieldName, FieldError>> = {}

  const text = {
    fullName: cleanText(raw.fullName),
    province: cleanText(raw.province),
    city: cleanText(raw.city),
    barangay: cleanText(raw.barangay),
    street: cleanText(raw.street),
    landmark: cleanText(raw.landmark),
  }
  for (const field of Object.keys(RULES) as (keyof typeof RULES)[]) {
    const error = checkText(text[field], RULES[field])
    if (error) errors[field] = error
  }

  const phone = normalizePhone(raw.phone)
  if (cleanText(raw.phone) === '') errors.phone = 'required'
  else if (phone === null) errors.phone = 'invalid'

  const itemsError = checkItems(raw.items)
  if (itemsError) errors.platforms = itemsError

  if (!raw.consent) errors.consent = 'required'

  if (Object.keys(errors).length > 0 || phone === null) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    order: {
      items: raw.items.flatMap((item) => (isPlatform(item.platform) ? [{ platform: item.platform, quantity: item.quantity }] : [])),
      ...text,
      phone,
      consent: true,
    },
  }
}

import {
  BUNDLE_CARD_COUNT,
  BUNDLE_IDS,
  PLATFORMS,
  type BundleId,
  type Order,
  type Platform,
  type RawOrder,
} from './order'

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

export type FieldError = 'required' | 'tooShort' | 'tooLong' | 'invalid' | 'wrongCount'

export type ValidationResult =
  | { ok: true; order: Order }
  | { ok: false; errors: Partial<Record<FieldName, FieldError>> }

// Names: letters, spaces and . ' - only. Places and addresses also allow digits and , # ( ) / &.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u
const PLACE = /^[\p{L}\p{M}\p{N} .,#'’()/&-]+$/u
const LANDMARK = /^[\p{L}\p{M}\p{N} .,#'’()/&:;-]+$/u

/** Trim, collapse whitespace, drop control characters. */
export function cleanText(value: string): string {
  return value
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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

const RULES = {
  fullName: { min: 2, max: 80, pattern: NAME },
  province: { min: 2, max: 60, pattern: PLACE },
  city: { min: 2, max: 60, pattern: PLACE },
  barangay: { min: 2, max: 60, pattern: PLACE },
  street: { min: 3, max: 120, pattern: PLACE },
  landmark: { min: 8, max: 200, pattern: LANDMARK },
} satisfies Record<string, TextRule>

function isBundleId(value: string): value is BundleId {
  return (BUNDLE_IDS as readonly string[]).includes(value)
}

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value)
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

  const bundleId = raw.bundleId
  const platforms = [...new Set(raw.platforms)]
  if (!isBundleId(bundleId) || !platforms.every(isPlatform)) {
    errors.platforms = 'invalid'
  } else if (platforms.length !== BUNDLE_CARD_COUNT[bundleId]) {
    errors.platforms = platforms.length === 0 ? 'required' : 'wrongCount'
  }

  if (!raw.consent) errors.consent = 'required'

  if (Object.keys(errors).length > 0 || phone === null || !isBundleId(bundleId)) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    order: {
      bundleId,
      platforms: platforms.filter(isPlatform),
      ...text,
      phone,
      consent: true,
    },
  }
}

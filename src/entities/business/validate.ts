import { checkImageAddress } from '@/entities/menu/image'
import { validateTheme } from '@/entities/theme/validate'
import {
  checkBoolean,
  checkList,
  checkText,
  combine,
  fail,
  isMissing,
  isOneOf,
  pass,
  readField,
  safely,
  type Check,
} from '@/shared/lib/checks'
import { cleanLines } from '@/shared/lib/lines'
import type { FieldErrors, Validated } from '@/shared/lib/validation'
import { BUSINESS_TYPES, type Business, type BusinessPatch, type BusinessType, type NewBusinessInput } from './business'
import { isValidSlug, SLUG_MAX, SLUG_MIN } from './slug'
import { checkSocial } from './social'

/** Room for the business details. The Design page uses the same numbers for its fields. */
export const BUSINESS_LIMITS = { name: 60, tagline: 100, phone: 20, address: 200, hours: 300, hoursLines: 6 } as const

// With the length checks below, a phone matches /^[+0-9 ()-]{7,20}$/.
const PHONE_CHARACTERS = /^[+0-9 ()-]+$/
const PHONE_MIN = 7

/** A phone number as people write it: digits, spaces, + ( ) and -. Empty means none. */
function checkPhone(value: unknown): Check<string> {
  const phone = checkText(value, { min: 0, max: BUSINESS_LIMITS.phone })
  if (!phone.ok || phone.value === '') return phone
  if (!PHONE_CHARACTERS.test(phone.value)) return fail('invalid')
  return phone.value.length < PHONE_MIN ? fail('tooShort') : phone
}

/** Opening hours keep their line breaks, at most BUSINESS_LIMITS.hoursLines lines. */
function checkHours(value: unknown): Check<string> {
  if (isMissing(value)) return pass('')
  if (typeof value !== 'string') return fail('invalid')
  const hours = cleanLines(value, BUSINESS_LIMITS.hoursLines)
  return hours.length > BUSINESS_LIMITS.hours ? fail('tooLong') : pass(hours)
}

type PatchField = keyof BusinessPatch

const PATCH_CHECKS: { [Field in PatchField]: (value: unknown) => Check<Business[Field]> } = {
  name: (value) => checkText(value, { max: BUSINESS_LIMITS.name }),
  tagline: (value) => checkText(value, { min: 0, max: BUSINESS_LIMITS.tagline }),
  logo: checkImageAddress,
  phone: checkPhone,
  address: (value) => checkText(value, { min: 0, max: BUSINESS_LIMITS.address }),
  hours: checkHours,
  social: checkSocial,
  theme: (value) => {
    const theme = validateTheme(value)
    return theme.ok ? pass(theme.value) : fail('invalid')
  },
}

const PATCH_FIELDS = Object.keys(PATCH_CHECKS) as PatchField[]

function keep<Field extends PatchField>(field: Field, input: unknown, patch: BusinessPatch, errors: FieldErrors<PatchField>) {
  const value = readField(input, field)
  if (value === undefined) return
  const check = PATCH_CHECKS[field](value)
  if (check.ok) patch[field] = check.value
  else errors[field] = check.error
}

/** The Design page's changes. Only the keys that are there are checked and kept; the others stay as they are. */
export function validateBusinessPatch(input: unknown): Validated<BusinessPatch, PatchField> {
  return safely<BusinessPatch, PatchField>('name', () => {
    const patch: BusinessPatch = {}
    const errors: FieldErrors<PatchField> = {}
    for (const field of PATCH_FIELDS) keep(field, input, patch, errors)
    return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: patch }
  })
}

function checkSlug(value: unknown): Check<string> {
  if (isMissing(value) || value === '') return fail('required')
  if (typeof value !== 'string') return fail('invalid')
  if (value.length < SLUG_MIN) return fail('tooShort')
  if (value.length > SLUG_MAX) return fail('tooLong')
  return isValidSlug(value) ? pass(value) : fail('invalid')
}

/** One to all of the business types, each once. */
function checkTypes(value: unknown): Check<BusinessType[]> {
  const list = checkList(value, BUSINESS_TYPES.length)
  if (!list.ok) return list
  if (list.value.length === 0) return fail('required')
  const types: BusinessType[] = []
  for (const type of list.value) {
    if (!isOneOf(BUSINESS_TYPES, type)) return fail('invalid')
    if (types.includes(type)) return fail('duplicate')
    types.push(type)
  }
  return pass(types)
}

type NewBusinessField = 'name' | 'slug' | 'types' | 'samples'

/** What the setup wizard sends. The slug must pass `isValidSlug`; whether it is free is the repository's call. */
export function validateNewBusiness(input: unknown): Validated<NewBusinessInput, NewBusinessField> {
  return safely<NewBusinessInput, NewBusinessField>('name', () =>
    combine({
      name: checkText(readField(input, 'name'), { max: BUSINESS_LIMITS.name }),
      slug: checkSlug(readField(input, 'slug')),
      types: checkTypes(readField(input, 'types')),
      samples: checkBoolean(readField(input, 'samples')),
    }),
  )
}

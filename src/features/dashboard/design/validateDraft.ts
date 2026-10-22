import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError } from '@/data/ownerRepository'
import type { Business, BusinessPatch } from '@/entities/business/business'
import { checkSocialLink, SOCIAL_NETWORKS } from '@/entities/business/social'
import { validateBusinessPatch } from '@/entities/business/validate'
import { isHexColor } from '@/entities/theme/color'
import { fieldErrorText } from '../ownerErrors'
import { COLOR_KEYS, sameSocial, sameTheme, type Draft } from './draft'

/** Where an error shows: a field, or `social` and `theme` for a refusal that does not say which link or color. */
export const DETAILS_FIELDS = [
  'name',
  'tagline',
  'logo',
  'phone',
  'address',
  'hours',
  'facebook',
  'instagram',
  'tiktok',
  'website',
  'social',
] as const

export const LOOK_FIELDS = ['primary', 'secondary', 'background', 'surface', 'theme'] as const

export type FieldKey = (typeof DETAILS_FIELDS)[number] | (typeof LOOK_FIELDS)[number]

/** The words for each refused field. */
export type DraftErrors = Partial<Record<FieldKey, string>>

export type DraftCheck = { ok: true; patch: BusinessPatch } | { ok: false; errors: DraftErrors }

/** Keeps only the errors that name a field of this page, so a refusal about something else never lands on a field. */
export function knownErrors(errors: Record<string, string>): DraftErrors {
  const known: DraftErrors = {}
  for (const field of [...DETAILS_FIELDS, ...LOOK_FIELDS]) {
    const words = errors[field]
    if (words !== undefined) known[field] = words
  }
  return known
}

const TEXT_FIELDS = ['name', 'tagline', 'phone', 'address', 'hours'] as const

const words = dashboardCopy.design

/** The words for a refused field: this page's own words for the field first, then the shared words for the code. */
export function fieldErrorWords(field: string, code: string): string {
  return words.fieldErrors[field]?.[code] ?? fieldErrorText(code) ?? ''
}

/** The words next to the fields of a call the repository refused. Empty when the failure is not about this page's fields. */
export function refusedFields(error: unknown): DraftErrors {
  if (!(error instanceof OwnerError)) return {}
  return knownErrors(Object.fromEntries(Object.entries(error.fields).map(([field, code]) => [field, groupWords(field, code)])))
}

// A refusal of a whole group names no link or color: it gets the words for the group.
function groupWords(field: string, code: string): string {
  if (field === 'social') return words.details.linksError
  if (field === 'theme') return words.look.colorsError
  return fieldErrorWords(field, code)
}

/** Links and colors are checked one by one, so the words land next to the right field. */
function detailErrors(draft: Draft, refused: ReadonlySet<string>): DraftErrors {
  const errors: DraftErrors = {}
  if (refused.has('social')) {
    for (const network of SOCIAL_NETWORKS) {
      const link = checkSocialLink(network, draft.social[network])
      if (!link.ok) errors[network] = fieldErrorWords(network, link.error)
    }
  }
  if (refused.has('theme')) {
    for (const key of COLOR_KEYS) {
      const empty = draft.theme[key].trim() === ''
      if (!isHexColor(draft.theme[key])) errors[key] = fieldErrorWords(key, empty ? 'required' : 'invalid')
    }
    // The card color is a color only when the owner chose one; automatic (null) is always fine.
    const { surface } = draft.theme
    const blank = surface?.trim() === ''
    if (surface !== null && !isHexColor(surface)) errors.surface = fieldErrorWords('surface', blank ? 'required' : 'invalid')
  }
  return errors
}

/**
 * Checks the draft with the business validator for instant feedback (the repository checks again). On success the patch
 * holds only what differs from the saved business. A group change sends the whole group: the theme and the four links.
 */
export function checkDraft(draft: Draft, saved: Business): DraftCheck {
  const checked = validateBusinessPatch(draft)
  if (!checked.ok) {
    const errors = detailErrors(draft, new Set(Object.keys(checked.errors)))
    for (const [field, code] of Object.entries(checked.errors)) {
      if (field === 'social' || field === 'theme') {
        if (!hasErrorIn(errors, field)) errors[field] = groupWords(field, code)
      } else {
        errors[field as FieldKey] = fieldErrorWords(field, code)
      }
    }
    return { ok: false, errors }
  }

  const clean = checked.value
  const patch: BusinessPatch = {}
  for (const key of TEXT_FIELDS) {
    const value = clean[key]
    if (value !== undefined && value !== saved[key]) patch[key] = value
  }
  if (clean.logo !== undefined && clean.logo !== saved.logo) patch.logo = clean.logo
  if (clean.social && !sameSocial(clean.social, saved.social)) patch.social = clean.social
  if (clean.theme && !sameTheme(clean.theme, saved.theme)) patch.theme = clean.theme
  return { ok: true, patch }
}

// A group error is only for the case when no single link or color could be blamed.
function hasErrorIn(errors: DraftErrors, group: string): boolean {
  const members: readonly FieldKey[] = group === 'social' ? SOCIAL_NETWORKS : [...COLOR_KEYS, 'surface']
  return members.some((member) => errors[member] !== undefined)
}

import type { Business, SocialLinks } from '@/entities/business/business'
import { BUSINESS_LIMITS } from '@/entities/business/validate'
import { checkSocialLink, SOCIAL_NETWORKS } from '@/entities/business/social'
import { isHexColor } from '@/entities/theme/color'
import type { Theme } from '@/entities/theme/theme'
import { checkText } from '@/shared/lib/checks'
import { cleanLines } from '@/shared/lib/lines'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'

/** What the Design page edits: the business's details and look, as the owner has them on screen (text may be half typed). */
export type Draft = Pick<Business, 'name' | 'tagline' | 'logo' | 'phone' | 'address' | 'hours' | 'social' | 'theme'>

export const COLOR_KEYS = ['primary', 'secondary', 'background'] as const
export type ColorKey = (typeof COLOR_KEYS)[number]

/** Every choice of a theme that is not a color: compared as they are. */
export const CHOICE_KEYS = [
  'style',
  'card',
  'photo',
  'title',
  'header',
  'decor',
  'backdrop',
  'backdropPicture',
  'backdropVeil',
  'spotlight',
  'font',
  'buttonStyle',
  'layout',
  'mode',
] as const
export type ThemeChoiceKey = (typeof CHOICE_KEYS)[number]

// A new key in Theme that is in neither list is a type error here, so sameTheme can never forget a field again.
type Unlisted = Exclude<keyof Theme, ColorKey | 'surface' | ThemeChoiceKey>
const everyKeyListed: [Unlisted] extends [never] ? true : never = true
void everyKeyListed

/** The saved business as a draft: copies, so editing the draft never touches the shared state. */
export function draftOf(business: Business): Draft {
  const { name, tagline, logo, phone, address, hours, social, theme } = business
  return { name, tagline, logo, phone, address, hours, social: { ...social }, theme: { ...theme } }
}

/** Two card colors are the same when both are automatic (null) or both are the same color, in any case. */
export function sameSurface(a: string | null, b: string | null): boolean {
  return a === null || b === null ? a === b : a.toLowerCase() === b.toLowerCase()
}

// Colors are stored in lowercase, so "#8B5A2B" typed over "#8b5a2b" is no change. Every field counts.
export function sameTheme(a: Theme, b: Theme): boolean {
  return (
    COLOR_KEYS.every((key) => a[key].toLowerCase() === b[key].toLowerCase()) &&
    sameSurface(a.surface, b.surface) &&
    CHOICE_KEYS.every((key) => a[key] === b[key])
  )
}

export function sameSocial(a: SocialLinks, b: SocialLinks): boolean {
  return SOCIAL_NETWORKS.every((network) => a[network] === b[network])
}

export function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.name === b.name &&
    a.tagline === b.tagline &&
    a.logo === b.logo &&
    a.phone === b.phone &&
    a.address === b.address &&
    a.hours === b.hours &&
    sameSocial(a.social, b.social) &&
    sameTheme(a.theme, b.theme)
  )
}

/** The text as the save will keep it: cleaned the way the validator does, and empty when it has nothing to read. */
function savedText(value: string): string {
  const checked = checkText(value, { min: 0, max: Number.MAX_SAFE_INTEGER })
  return checked.ok ? checked.value : ''
}

/**
 * The color of each key that the preview falls back to while a color is half typed. `surface` is the card color (null is
 * automatic); left out, the saved one is used.
 */
export type KeptColors = Readonly<Record<ColorKey, string>> & { readonly surface?: string | null | undefined }

const wholeSurface = (surface: string | null) => surface === null || isHexColor(surface)

/** The colors of a theme where they are colors, and `kept` where they are not yet: the last colors that were whole. */
export function wholeColors(theme: Theme, kept: KeptColors): KeptColors {
  return {
    primary: isHexColor(theme.primary) ? theme.primary : kept.primary,
    secondary: isHexColor(theme.secondary) ? theme.secondary : kept.secondary,
    background: isHexColor(theme.background) ? theme.background : kept.background,
    surface: wholeSurface(theme.surface) ? theme.surface : (kept.surface ?? null),
  }
}

/**
 * The draft as the preview draws it, on every keystroke. A color that is not a color yet (half typed) keeps the last whole
 * color of the draft (`kept`, or the saved one when there is none), and a link that is not a link yet shows nothing, so the
 * preview never flashes or draws a broken value. Text is cleaned as the save cleans it, so the preview shows no Address or
 * Hours block (or tagline) for text that will be saved as nothing.
 */
export function previewOf(draft: Draft, saved: Business, kept?: KeptColors): MenuViewBusiness {
  const theme: Theme = { ...draft.theme }
  for (const key of COLOR_KEYS) if (!isHexColor(theme[key])) theme[key] = kept?.[key] ?? saved.theme[key]
  if (!wholeSurface(theme.surface)) theme.surface = kept?.surface !== undefined ? kept.surface : saved.theme.surface
  const social = { ...draft.social }
  for (const network of SOCIAL_NETWORKS) {
    const link = checkSocialLink(network, social[network])
    social[network] = link.ok ? link.value : ''
  }
  return {
    ...draft,
    name: draft.name.trim() === '' ? saved.name : draft.name,
    tagline: savedText(draft.tagline),
    phone: savedText(draft.phone),
    address: savedText(draft.address),
    hours: cleanLines(draft.hours, BUSINESS_LIMITS.hoursLines),
    social,
    theme,
    // What the business serves picks the drawing shown for a product without a picture.
    types: saved.types,
  }
}

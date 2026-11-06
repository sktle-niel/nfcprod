import { isTrustedPicture } from '@/config/pictures'
import { checkImageAddress } from '@/entities/menu/image'
import { samplePicture } from '@/entities/menu/samplePictures'
import type { Theme } from '@/entities/theme/theme'

/**
 * The address to draw a picture from, or null to draw none. The renderer does not trust its input: the address must be a
 * clean one (`checkImageAddress`) and one the page may show (`isTrustedPicture`). The one exception is a photo of the demo's
 * own sample menus, which must be exactly the path of one of our files (`samplePicture`).
 */
export function pictureSrc(value: unknown): string | null {
  const sample = samplePicture(value)
  if (sample !== null) return sample
  const address = checkImageAddress(value)
  return address.ok && address.value !== null && isTrustedPicture(address.value) ? address.value : null
}

/**
 * The theme as a page may paint it: a photo backdrop keeps only an address the page may show (`pictureSrc`). EVERY
 * element that hands a business theme to `toCssVars` goes through this — the menu's root and any wrapper around it —
 * because custom properties inherit: a wrapper that painted the raw address would hand it to a root that refused it.
 */
export function renderableTheme(theme: Theme): Theme {
  if (theme.backdrop !== 'picture' || theme.backdropPicture === null) return theme
  return { ...theme, backdropPicture: pictureSrc(theme.backdropPicture) }
}

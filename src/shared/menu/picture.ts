import { isTrustedPicture } from '@/config/pictures'
import { checkImageAddress } from '@/entities/menu/image'

/**
 * The address to draw a picture from, or null to draw none. The renderer does not trust its input: the address must be a
 * clean one (`checkImageAddress`) and one the page may show (`isTrustedPicture`).
 */
export function pictureSrc(value: unknown): string | null {
  const address = checkImageAddress(value)
  return address.ok && address.value !== null && isTrustedPicture(address.value) ? address.value : null
}

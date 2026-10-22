import { publicOrigin } from '@/config/publicOrigin'
import { menuUrl } from '@/entities/business/links'

/** The link a menu has on NFC cards and in QR codes. Every page builds it here, so they all show the same one. */
export function menuLink(slug: string): string {
  return menuUrl(slug, publicOrigin())
}

import type { Business } from '@/entities/business/business'
import { LINK_MAX, SOCIAL_NETWORKS } from '@/entities/business/social'
import { parseHttpsUrl } from '@/shared/lib/url'

/** A phone number as a dial link: digits and a leading plus only. Null when there is nothing to dial. */
export function dialHref(phone: string): string | null {
  const dial = phone.replace(/[^\d+]/g, '')
  return /\d/.test(dial) ? `tel:${dial}` : null
}

/** The social links a page may draw: only a clean https link is kept, whatever the stored value says. */
export function socialLinks(social: Business['social']): { network: (typeof SOCIAL_NETWORKS)[number]; href: string }[] {
  return SOCIAL_NETWORKS.flatMap((network) => {
    const url = parseHttpsUrl(social[network], LINK_MAX)
    return url ? [{ network, href: url.href }] : []
  })
}

/**
 * A Google Maps search for an address, or null when there is none. The owner's text stays inside the query: everything that could
 * end it is encoded, and half a character pair (which `encodeURIComponent` refuses) becomes a replacement mark instead of a crash.
 */
export function directionsHref(address: string): string | null {
  const place = address.trim().replace(/\p{Cs}/gu, '�')
  return place === '' ? null : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
}

/** True when a Visit section has something to show: a template asks before it draws its link to that section. */
export function hasVisit(business: Pick<Business, 'phone' | 'address' | 'hours' | 'social'>): boolean {
  return [business.hours, business.address, business.phone].some((line) => line.trim() !== '') || socialLinks(business.social).length > 0
}

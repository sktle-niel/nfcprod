import { combine, fail, isMissing, pass, readField, type Check } from '@/shared/lib/checks'
import { isRecord } from '@/shared/lib/record'
import { isOnDomain, parseHttpsUrl } from '@/shared/lib/url'
import type { SocialLinks } from './business'

export type SocialNetwork = keyof SocialLinks
export const SOCIAL_NETWORKS = ['facebook', 'instagram', 'tiktok', 'website'] as const satisfies readonly SocialNetwork[]

/** The longest link the Design page takes. */
export const LINK_MAX = 200

// The domains each network's links live on. A subdomain (m.facebook.com, www.tiktok.com) is on its domain too.
const DOMAINS: Record<Exclude<SocialNetwork, 'website'>, readonly string[]> = {
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * One link: empty for none, or an https link on the network's own domain (any https site for `website`). A link typed
 * without a scheme ("facebook.com/cafeluna") gets https://. The parser's clean form is kept.
 */
export function checkSocialLink(network: SocialNetwork, value: unknown): Check<string> {
  if (isMissing(value)) return pass('')
  if (typeof value !== 'string') return fail('invalid')
  const typed = value.trim()
  if (typed === '') return pass('')
  if (typed.length > LINK_MAX) return fail('tooLong')
  const url = parseHttpsUrl(SCHEME.test(typed) ? typed : `https://${typed}`, LINK_MAX)
  if (url === null) return fail('invalid')
  if (network === 'website') return pass(url.href)
  const onNetwork = url.port === '' && DOMAINS[network].some((domain) => isOnDomain(url, domain))
  return onNetwork ? pass(url.href) : fail('invalid')
}

/** All four links. A missing one reads as none. The code is the first problem, in the order of SOCIAL_NETWORKS. */
export function checkSocial(value: unknown): Check<SocialLinks> {
  if (!isRecord(value)) return fail('invalid')
  const links = combine({
    facebook: checkSocialLink('facebook', readField(value, 'facebook')),
    instagram: checkSocialLink('instagram', readField(value, 'instagram')),
    tiktok: checkSocialLink('tiktok', readField(value, 'tiktok')),
    website: checkSocialLink('website', readField(value, 'website')),
  })
  if (links.ok) return pass(links.value)
  const first = SOCIAL_NETWORKS.map((network) => links.errors[network]).find((error) => error !== undefined)
  return fail(first ?? 'invalid')
}

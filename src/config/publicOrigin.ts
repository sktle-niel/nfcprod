import { parseHttpsOrigin } from '@/shared/lib/url'
import { env } from './env'

/**
 * The public address of the platform, as an origin, or null when the setting is empty or not usable: a plain https
 * address with a public host name, no path, no query and no user name or password. The menu links on NFC cards and in
 * QR codes are built from it, and a card holds its link for good, so it must be the final domain.
 */
export const usablePublicOrigin = (value: string): string | null => parseHttpsOrigin(value)

/** The origin menu links start with: the configured address, else the address the page is open on (development). */
export function originFor(configured: string, pageOrigin: string): string {
  return usablePublicOrigin(configured) ?? pageOrigin
}

/** True when no public address is set, or the page is open on it. A card written from another address would break. */
export function isOnPublicOrigin(configured: string, pageOrigin: string): boolean {
  const set = usablePublicOrigin(configured)
  return set === null || set === pageOrigin
}

/** What `publicOrigin()` and `onPublicOrigin()` use now. Read once, when the page loads, like every other setting. */
export const publicOrigin = (): string => originFor(env.publicOrigin, window.location.origin)
export const onPublicOrigin = (): boolean => isOnPublicOrigin(env.publicOrigin, window.location.origin)

// Once, when the page loads: a setting that was filled in and then refused, so a typo does not silently print cards
// with the wrong address. The line names the variable and never repeats its value.
if (env.publicOrigin !== '' && usablePublicOrigin(env.publicOrigin) === null) {
  console.warn('VITE_PUBLIC_ORIGIN is ignored: it needs a plain https address such as https://menu.example.com with no path. The address of the page is used.')
}

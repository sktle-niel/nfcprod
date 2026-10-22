import { parseHttpsUrl, parseHttpsOrigin } from '@/shared/lib/url'
import { env } from './env'

/** The origin pictures are served from, or null when the setting is empty or not usable (a plain https address, no path). */
export const usableStorageOrigin = (value: string): string | null => parseHttpsOrigin(value)

/**
 * Whether a picture address that already passed `checkImageAddress` may be shown or kept. A data address is what the demo
 * makes from an upload: its bytes were checked, and it asks the network for nothing. An https address must be on the
 * storage origin, so a picture can never send a visitor's browser to a host of someone else's choosing. With no storage
 * origin there is no https picture. The server enforces the same rule on its side; this is the page's own check.
 */
export function isTrustedPicture(address: string, storageOrigin: string | null = usableStorageOrigin(env.storageOrigin)): boolean {
  if (address.startsWith('data:')) return true
  const url = parseHttpsUrl(address, 2048)
  return url !== null && storageOrigin !== null && url.origin === storageOrigin
}

// Once, when the page loads: a setting that was filled in and then refused, so a typo does not silently drop every
// picture. The line names the variable and never repeats its value.
if (env.storageOrigin !== '' && usableStorageOrigin(env.storageOrigin) === null) {
  console.warn('VITE_STORAGE_ORIGIN is ignored: it needs a plain https address such as https://images.example.com with no path. No https picture is shown.')
}

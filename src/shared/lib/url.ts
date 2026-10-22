// Spaces and control characters are never part of a link someone means, and the URL parser would quietly drop some.
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\u0000- \u007f-\u009f]/

/**
 * An https link typed or pasted by someone, or null. It must parse, have a public host name (with a dot), carry no user
 * name or password, contain no spaces or control characters, and be at most `maxLength` long, before and after the
 * parser writes it out. Store `href` of the result: the parser's clean form.
 */
export function parseHttpsUrl(value: string, maxLength: number): URL | null {
  if (typeof value !== 'string' || value === '' || value.length > maxLength || UNSAFE.test(value)) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const ok =
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.hostname.includes('.') &&
    url.href.length <= maxLength
  return ok ? url : null
}

/** True when the link's host is `domain` or one of its subdomains: m.facebook.com is on facebook.com, evilfacebook.com is not. */
export function isOnDomain(url: URL, domain: string): boolean {
  return url.hostname === domain || url.hostname.endsWith(`.${domain}`)
}

/**
 * The origin of a plain https address: nothing after the host (no path, query or fragment) and no user name or password.
 * Null for anything else. For settings that name a place, such as the platform's public address or its picture storage.
 */
export function parseHttpsOrigin(value: string): string | null {
  const url = parseHttpsUrl(value, 200)
  if (url === null || url.pathname !== '/' || url.search !== '' || url.hash !== '') return null
  return url.origin
}

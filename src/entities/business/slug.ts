// A slug is the permanent part of a business link (printed on NFC cards), so it is validated strictly.
export const SLUG_MIN = 3
export const SLUG_MAX = 40

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Words that would collide with app routes or look official.
const RESERVED = new Set([
  'admin', 'api', 'app', 'auth', 'dashboard', 'login', 'logout', 'signup', 'register',
  'm', 'menu', 'static', 'assets', 'public', 'help', 'support', 'about', 'terms',
  'privacy', 'settings', 'root', 'www', 'mail', 'null', 'undefined',
])

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= SLUG_MIN &&
    value.length <= SLUG_MAX &&
    SLUG_PATTERN.test(value) &&
    !RESERVED.has(value)
  )
}

/** What is wrong with a slug, or null when `isValidSlug` takes it. `reserved` is a well-formed slug on the blocklist. */
export function slugProblem(value: string): 'invalid' | 'reserved' | null {
  const wellFormed =
    typeof value === 'string' && value.length >= SLUG_MIN && value.length <= SLUG_MAX && SLUG_PATTERN.test(value)
  if (!wellFormed) return 'invalid'
  return RESERVED.has(value) ? 'reserved' : null
}

/**
 * A slug made from a business name, for the setup wizard to offer: "Café Ñora's" becomes "cafe-nora-s". Accents are
 * dropped, anything else outside a-z and 0-9 becomes one hyphen. Empty when nothing usable is left, it is too short,
 * or it is reserved.
 */
export function suggestSlug(name: string): string {
  if (typeof name !== 'string') return ''
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
  return isValidSlug(slug) ? slug : ''
}

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

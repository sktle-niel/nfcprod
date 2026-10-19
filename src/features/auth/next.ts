import { CARD_ORDER, OWNER_HOME } from '@/shared/session/authLink'

/**
 * The page to open after sign-up or log-in, taken from ?next=. Only paths inside the owner area, and the
 * card order form on the home page, are allowed, so a crafted link can never send someone elsewhere.
 */
export function safeNext(value: string | null): string {
  if (value === CARD_ORDER) return value
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return OWNER_HOME
  const path = value.split(/[?#]/, 1)[0] ?? ''
  return path === OWNER_HOME || path.startsWith(`${OWNER_HOME}/`) ? value : OWNER_HOME
}

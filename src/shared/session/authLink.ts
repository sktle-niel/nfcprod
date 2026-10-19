import { useSession } from './context'

/** Where owners work once signed in. */
export const OWNER_HOME = '/dashboard'

export type AuthMode = 'signup' | 'login'

// The address opens the sign-up / log-in modal on any page: ?auth=signup&next=/dashboard
export const AUTH_PARAM = 'auth'
export const NEXT_PARAM = 'next'

export function authLink(mode: AuthMode, next?: string): string {
  const params = new URLSearchParams({ [AUTH_PARAM]: mode })
  if (next) params.set(NEXT_PARAM, next)
  return `?${params.toString()}`
}

export function toAuthMode(value: string | null): AuthMode | null {
  return value === 'signup' || value === 'login' ? value : null
}

/** "Get started": the owner area when signed in, otherwise the sign-up modal that leads there. */
export function useStartLink(): string {
  const { session } = useSession()
  return session ? OWNER_HOME : authLink('signup', OWNER_HOME)
}

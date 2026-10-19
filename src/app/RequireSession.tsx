import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authLink } from '@/shared/session/authLink'
import { useSession } from '@/shared/session/context'

/** Owner pages need an account. Without one the visitor gets the sign-up modal on the home page, then comes back. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session, ready } = useSession()
  const location = useLocation()

  if (!ready) return null
  if (!session) return <Navigate to={`/${authLink('signup', `${location.pathname}${location.search}`)}`} replace />
  return children
}

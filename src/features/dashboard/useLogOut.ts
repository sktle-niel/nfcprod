import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/shared/session/context'

/** Signs the owner out. They leave first, so they land on the home page and not on the sign-up modal. */
export function useLogOut(): () => void {
  const { logOut } = useSession()
  const navigate = useNavigate()
  return useCallback(() => {
    navigate('/', { replace: true })
    void logOut()
  }, [logOut, navigate])
}

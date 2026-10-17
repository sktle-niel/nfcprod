import { lazy, Suspense, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { safeNext } from '@/features/auth/next'
import { AUTH_PARAM, NEXT_PARAM, toAuthMode } from '@/shared/session/authLink'
import { useSession } from '@/shared/session/context'

// Loaded only when the modal opens, so the public pages stay light.
const AuthDialog = lazy(async () => ({ default: (await import('@/features/auth/AuthDialog')).AuthDialog }))

/** Opens the sign-up / log-in modal on any page whose address asks for it, and moves on once signed in. */
export function AuthHost() {
  const [params, setParams] = useSearchParams()
  const { session } = useSession()
  const navigate = useNavigate()
  const mode = toAuthMode(params.get(AUTH_PARAM))
  const target = safeNext(params.get(NEXT_PARAM))

  useEffect(() => {
    if (mode && session) navigate(target, { replace: true })
  }, [mode, session, target, navigate])

  if (!mode || session) return null

  function update(change: (next: URLSearchParams) => void) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        change(next)
        return next
      },
      { replace: true },
    )
  }

  return (
    <Suspense fallback={null}>
      <AuthDialog
        mode={mode}
        onMode={(to) => update((next) => next.set(AUTH_PARAM, to))}
        onClose={() =>
          update((next) => {
            next.delete(AUTH_PARAM)
            next.delete(NEXT_PARAM)
          })
        }
      />
    </Suspense>
  )
}

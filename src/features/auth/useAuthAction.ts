import { useCallback, useState } from 'react'
import { AuthError, type AuthFailure } from '@/data/auth'

export type AuthAction = ReturnType<typeof useAuthAction>

/** Runs one sign-in step at a time and keeps why it failed. On success the modal closes, so busy stays set. */
export function useAuthAction() {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<AuthFailure | null>(null)

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    setFailure(null)
    try {
      await action()
    } catch (error) {
      setFailure(error instanceof AuthError ? error.code : 'network')
      setBusy(false)
    }
  }, [])

  const clear = useCallback(() => setFailure(null), [])

  return { busy, failure, run, clear }
}

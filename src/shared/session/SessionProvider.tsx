import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthRepository } from '@/data/auth'
import type { Session } from '@/entities/account/account'
import { SessionContext, type SessionState } from './context'

type Props = { repository: AuthRepository; children: ReactNode }

/** Loads the current session once, then keeps it in step with sign-up, log-in and log-out. */
export function SessionProvider({ repository, children }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    const settle = (current: Session | null) => {
      if (!live) return
      setSession(current)
      setReady(true)
    }
    // A failed read counts as signed out, so the page asks for a sign-in instead of staying blank for good.
    void repository.current().then(settle, () => settle(null))
    return () => {
      live = false
    }
  }, [repository])

  // The actions do not depend on who is signed in, so they keep their identity: a hook that calls one from an effect or a
  // watcher does not start over every time the session changes.
  const signUp = useCallback<SessionState['signUp']>(async (input) => setSession(await repository.signUp(input)), [repository])
  const logIn = useCallback<SessionState['logIn']>(async (input) => setSession(await repository.logIn(input)), [repository])
  const continueWithGoogle = useCallback<SessionState['continueWithGoogle']>(
    async () => setSession(await repository.continueWithGoogle()),
    [repository],
  )
  const logOut = useCallback<SessionState['logOut']>(async () => {
    await repository.logOut()
    setSession(null)
  }, [repository])

  const value = useMemo<SessionState>(
    () => ({ session, ready, signUp, logIn, continueWithGoogle, logOut }),
    [session, ready, signUp, logIn, continueWithGoogle, logOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

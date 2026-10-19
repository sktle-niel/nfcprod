import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
    void repository.current().then((current) => {
      if (!live) return
      setSession(current)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [repository])

  const value = useMemo<SessionState>(
    () => ({
      session,
      ready,
      signUp: async (input) => setSession(await repository.signUp(input)),
      logIn: async (input) => setSession(await repository.logIn(input)),
      continueWithGoogle: async () => setSession(await repository.continueWithGoogle()),
      logOut: async () => {
        await repository.logOut()
        setSession(null)
      },
    }),
    [session, ready, repository],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

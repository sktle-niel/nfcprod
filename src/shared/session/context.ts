import { createContext, useContext } from 'react'
import type { LogInInput, Session, SignUpInput } from '@/entities/account/account'

/** The signed-in owner, shared by every screen. Global client state is only the session and the theme. */
export type SessionState = {
  session: Session | null
  /** False until the app knows whether this browser already has a session. */
  ready: boolean
  signUp(input: SignUpInput): Promise<void>
  logIn(input: LogInInput): Promise<void>
  continueWithGoogle(): Promise<void>
  logOut(): Promise<void>
}

export const SessionContext = createContext<SessionState | null>(null)

export function useSession(): SessionState {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession needs a SessionProvider above it')
  return value
}

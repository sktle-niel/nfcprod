import type { Account, LogInInput, Session, SignUpInput } from '@/entities/account/account'
import { normalizeEmail } from '@/entities/account/validate'

export type AuthFailure = 'emailTaken' | 'invalidCredentials' | 'rateLimited' | 'network'

export class AuthError extends Error {
  code: AuthFailure

  constructor(code: AuthFailure) {
    super(code)
    this.code = code
  }
}

/** The seam between the sign-up and log-in screens and the auth provider (Supabase Auth later). */
export interface AuthRepository {
  /** The session this browser already has, or null. */
  current(): Promise<Session | null>
  signUp(input: SignUpInput): Promise<Session>
  logIn(input: LogInInput): Promise<Session>
  /** With a backend this leaves for Google's consent screen and comes back signed in. */
  continueWithGoogle(): Promise<Session>
  logOut(): Promise<void>
}

type Stored = { account: Account; salt: string; hash: string }

const encoder = new TextEncoder()

async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Demo mode: accounts and the session live in this tab's memory and are gone after a reload.
 * Nothing leaves the browser and nothing is written to storage. Passwords are kept only as salted
 * hashes here; the real provider hashes them with bcrypt and keeps the session in HttpOnly cookies.
 */
export function createMockAuth({ delay = 400 }: { delay?: number } = {}): AuthRepository {
  const accounts = new Map<string, Stored>()
  let session: Session | null = null
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay))

  function open(account: Account): Session {
    session = { account, demo: true }
    return session
  }

  return {
    async current() {
      return session
    },
    async signUp({ name, email, password }) {
      await wait()
      const key = normalizeEmail(email)
      if (accounts.has(key)) throw new AuthError('emailTaken')
      const salt = crypto.randomUUID()
      const account: Account = { id: crypto.randomUUID(), name, email: key, method: 'password' }
      accounts.set(key, { account, salt, hash: await hashPassword(password, salt) })
      return open(account)
    },
    async logIn({ email, password }) {
      await wait()
      const stored = accounts.get(normalizeEmail(email))
      // The same answer for an unknown email and a wrong password, so nobody can probe for accounts.
      if (!stored || (await hashPassword(password, stored.salt)) !== stored.hash) throw new AuthError('invalidCredentials')
      return open(stored.account)
    },
    async continueWithGoogle() {
      await wait()
      return open({ id: crypto.randomUUID(), name: 'Demo Owner', email: 'owner@example.com', method: 'google' })
    },
    async logOut() {
      session = null
    },
  }
}

export const auth: AuthRepository = createMockAuth()

/** True while the mock above stands in for the real auth provider. */
export const authDemo = true

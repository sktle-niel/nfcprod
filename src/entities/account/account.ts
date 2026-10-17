/** How an owner signs in. */
export type SignInMethod = 'password' | 'google'

/** The signed-in business owner as the app sees them. Never holds a password or a token. */
export type Account = {
  id: string
  name: string
  /** Lowercased. Also the username for email and password sign-in. */
  email: string
  method: SignInMethod
}

export type Session = {
  account: Account
  /** True while no backend is connected: the account lives only in this browser tab. */
  demo: boolean
}

export type SignUpInput = { name: string; email: string; password: string }
export type LogInInput = { email: string; password: string }

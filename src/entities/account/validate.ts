import { cleanText, PERSON_NAME } from '@/shared/lib/text'
import type { LogInInput, SignUpInput } from './account'

export type AccountField = 'name' | 'email' | 'password'
export type AccountError = 'required' | 'tooShort' | 'tooLong' | 'invalid'
export type AccountErrors = Partial<Record<AccountField, AccountError>>

/** Long passphrases are welcome; 72 is where bcrypt stops reading, so longer would be a false promise. */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EMAIL_MAX = 254

/** Emails are compared without case and surrounding spaces. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function checkEmail(email: string): AccountError | null {
  if (email === '') return 'required'
  if (email.length > EMAIL_MAX) return 'tooLong'
  return EMAIL.test(email) ? null : 'invalid'
}

function checkPassword(password: string): AccountError | null {
  if (password === '') return 'required'
  if (password.length < PASSWORD_MIN) return 'tooShort'
  return password.length > PASSWORD_MAX ? 'tooLong' : null
}

function checkName(name: string): AccountError | null {
  if (name === '') return 'required'
  if (name.length < 2) return 'tooShort'
  if (name.length > 80) return 'tooLong'
  return PERSON_NAME.test(name) ? null : 'invalid'
}

function collect(checks: Partial<Record<AccountField, AccountError | null>>): AccountErrors {
  return Object.fromEntries(Object.entries(checks).filter(([, error]) => error !== null))
}

/** The server must repeat these checks. This only gives the owner fast feedback. */
export function validateSignUp(raw: SignUpInput): { ok: true; input: SignUpInput } | { ok: false; errors: AccountErrors } {
  const input = { name: cleanText(raw.name), email: normalizeEmail(raw.email), password: raw.password }
  const errors = collect({ name: checkName(input.name), email: checkEmail(input.email), password: checkPassword(input.password) })
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input }
}

/** Log-in only checks that both fields are there; the server decides if they match. */
export function validateLogIn(raw: LogInInput): { ok: true; input: LogInInput } | { ok: false; errors: AccountErrors } {
  const input = { email: normalizeEmail(raw.email), password: raw.password }
  const errors = collect({ email: checkEmail(input.email), password: input.password === '' ? 'required' : null })
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input }
}

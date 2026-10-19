import { copy } from '@/config/copy'
import type { AuthFailure } from '@/data/auth'
import type { AccountError, AccountField } from '@/entities/account/validate'

export function fieldError(field: AccountField, code: AccountError): string {
  const text = copy.auth.errors
  if (code === 'invalid') return field === 'email' ? text.email : text.name
  if (code === 'tooShort' && field === 'password') return text.passwordShort
  return text[code]
}

export function failureText(failure: AuthFailure): string {
  return copy.auth.errors[failure]
}

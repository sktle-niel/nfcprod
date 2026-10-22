import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerFailure } from '@/data/ownerRepository'
import type { ErrorCode } from '@/shared/lib/validation'

const text = dashboardCopy.shell

/** The words for a failed call to the owner's data. Anything that is not an `OwnerError` is "unknown": never show a raw message. */
export function ownerErrorText(error: unknown): string {
  const code: OwnerFailure | 'unknown' = error instanceof OwnerError ? error.code : 'unknown'
  return text.errors[code]
}

/** The words for a refused field. A code this app does not know is "invalid". */
export function fieldErrorText(code: string | undefined): string | undefined {
  if (code === undefined) return undefined
  return text.fieldErrors[code as ErrorCode] ?? text.fieldErrors.invalid
}

/** The refused fields of a failed call, as words per field name. Empty when the failure is not about fields. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof OwnerError)) return {}
  return Object.fromEntries(Object.entries(error.fields).map(([field, code]) => [field, fieldErrorText(code) ?? text.fieldErrors.invalid]))
}

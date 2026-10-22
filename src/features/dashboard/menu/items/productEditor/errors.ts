import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError } from '@/data/ownerRepository'
import { fieldErrorText } from '@/features/dashboard/ownerErrors'

const specific: Record<string, Record<string, string> | undefined> = dashboardCopy.productEditor.errors

/** The words for a refused field: the editor's own when it has them, else the shared ones. */
export function errorMessage(field: string, code: string): string {
  return specific[field]?.[code] ?? fieldErrorText(code) ?? dashboardCopy.shell.fieldErrors.invalid
}

/** Words per field for a map of field to error code. */
export function messagesOf(codes: Readonly<Record<string, string | undefined>>): Record<string, string> {
  const messages: Record<string, string> = {}
  for (const [field, code] of Object.entries(codes)) if (code !== undefined) messages[field] = errorMessage(field, code)
  return messages
}

/** The refused fields of a failed save, as words. Empty when the failure is not about fields. */
export function refusedFields(error: unknown): Record<string, string> {
  return error instanceof OwnerError ? messagesOf(error.fields) : {}
}

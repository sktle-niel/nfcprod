import { fieldErrorText } from '../ownerErrors'

/**
 * The words for a refused category or group name. `words` are the page's own, by error code; a code it has none for falls
 * back to the shared field words. `{max}` is the longest name for "too long" and the most entries for "too many".
 */
export function nameErrorText(
  words: Readonly<Record<string, string | undefined>>,
  code: string | undefined,
  limits: { name: number; entries: number },
): string | undefined {
  if (code === undefined) return undefined
  const max = code === 'tooMany' ? limits.entries : limits.name
  return (words[code] ?? fieldErrorText(code))?.replace('{max}', String(max))
}

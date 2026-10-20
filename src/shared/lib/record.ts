/** True for an object that is not an array. Use it to read JSON that came from outside, one field at a time. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

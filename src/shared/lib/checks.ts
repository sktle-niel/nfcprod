import { isRecord } from './record'
import { cleanText } from './text'
import type { ErrorCode, FieldErrors, Validated } from './validation'

// Small checks that the validators of outside input are built from. Each takes `unknown` and never throws.

/** What the check of one field gives back: the clean value, or why it was refused. */
export type Check<T> = { ok: true; value: T } | { ok: false; error: ErrorCode }

export function pass<T>(value: T): Check<T> {
  return { ok: true, value }
}

export function fail(error: ErrorCode): Check<never> {
  return { ok: false, error }
}

/** Not there at all: `undefined`, or `null` as JSON writes it. */
export function isMissing(value: unknown): value is null | undefined {
  return value === undefined || value === null
}

/**
 * One field of outside input. Only the object's own fields are read, so nothing comes in through a prototype and a key
 * such as "__proto__" is only a name. Anything that is not an object has no fields.
 */
export function readField(input: unknown, key: string): unknown {
  return isRecord(input) && Object.hasOwn(input, key) ? input[key] : undefined
}

/** True when `value` is one of the words of `list`. */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

/** A choice from a fixed list. */
export function checkOneOf<T extends string>(list: readonly T[], value: unknown): Check<T> {
  if (isMissing(value)) return fail('required')
  return isOneOf(list, value) ? pass(value) : fail('invalid')
}

export function checkBoolean(value: unknown): Check<boolean> {
  if (isMissing(value)) return fail('required')
  return typeof value === 'boolean' ? pass(value) : fail('invalid')
}

/** A whole number from `min` to `max`. Not a whole number is 'invalid'; one outside the bounds is 'range'. */
export function checkInteger(value: unknown, min: number, max: number): Check<number> {
  if (isMissing(value)) return fail('required')
  if (typeof value !== 'number' || !Number.isInteger(value)) return fail('invalid')
  if (value < min || value > max) return fail('range')
  // -0 is stored as 0.
  return pass(value + 0)
}

// Something a reader can see. A text made only of invisible marks or format characters counts as empty.
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u

/**
 * Free text, cleaned with `cleanText`, then measured. `min` defaults to 1: then a missing or empty text is 'required'.
 * With `min` 0 a missing or empty text is fine and reads as ''.
 */
export function checkText(value: unknown, limits: { min?: number; max: number }): Check<string> {
  const min = limits.min ?? 1
  if (isMissing(value)) return min > 0 ? fail('required') : pass('')
  if (typeof value !== 'string') return fail('invalid')
  const text = cleanText(value)
  if (!VISIBLE.test(text)) return min > 0 ? fail('required') : pass('')
  if (text.length < min) return fail('tooShort')
  if (text.length > limits.max) return fail('tooLong')
  return pass(text)
}

/** An array of at most `max` items. The length is checked before any item is read, so a huge array costs nothing. */
export function checkList(value: unknown, max: number): Check<readonly unknown[]> {
  if (isMissing(value)) return fail('required')
  if (!Array.isArray(value)) return fail('invalid')
  return value.length > max ? fail('tooMany') : pass(value)
}

/** How two names are compared: cleaned and without case, so "Iced " and "iced" are the same name. */
export function matchKey(text: string): string {
  return cleanText(text).toLowerCase()
}

/** True when two of `keys` are the same. */
export function hasDuplicates(keys: readonly unknown[]): boolean {
  return new Set(keys).size !== keys.length
}

type ValuesOf<C> = { [K in keyof C]: C[K] extends Check<infer T> ? T : never }

/** Puts the checks of every field together: every clean value, or every problem. Nothing is half accepted. */
export function combine<C extends Record<string, Check<unknown>>>(
  checks: C,
): Validated<ValuesOf<C>, Extract<keyof C, string>> {
  const errors: FieldErrors<Extract<keyof C, string>> = {}
  const values: Record<string, unknown> = {}
  for (const [key, check] of Object.entries(checks)) {
    if (check.ok) values[key] = check.value
    else errors[key as Extract<keyof C, string>] = check.error
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  // Every check passed, so there is exactly one clean value for each field.
  return { ok: true, value: values as ValuesOf<C> }
}

/**
 * Runs a validator so that no input can make it throw, not even an object whose getter throws or a revoked proxy. Such
 * input is refused as 'invalid' on `field`.
 */
export function safely<Value, Field extends string>(field: Field, run: () => Validated<Value, Field>): Validated<Value, Field> {
  try {
    return run()
  } catch {
    const errors: FieldErrors<Field> = {}
    errors[field] = 'invalid'
    return { ok: false, errors }
  }
}

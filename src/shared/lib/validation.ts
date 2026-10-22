/** Why a field was refused. The screen turns a code into words (src/config), so a code is never shown as it is. */
export type ErrorCode = 'required' | 'tooShort' | 'tooLong' | 'invalid' | 'range' | 'tooMany' | 'duplicate'

/** One code per field that has a problem. Fields that are fine are left out. */
export type FieldErrors<Field extends string> = Partial<Record<Field, ErrorCode>>

/** What a check of outside input gives back: the clean value, or the problems. Nothing is ever half accepted. */
export type Validated<Value, Field extends string = string> =
  | { ok: true; value: Value }
  | { ok: false; errors: FieldErrors<Field> }

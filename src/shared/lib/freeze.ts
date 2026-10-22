/** Freezes `value` and everything inside it, so constant data shared by the whole app cannot be changed by mistake. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Reflect.ownKeys(value)) {
      const child: unknown = Reflect.get(value, key)
      deepFreeze(child)
    }
  }
  return value
}

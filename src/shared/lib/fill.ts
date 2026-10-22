/**
 * Puts values into the `{key}` places of a sentence. It is one pass over the sentence, and a value goes in exactly as it is:
 * `String.replace` reads "$&", "$$" and a few other sequences in its replacement as patterns, so a name such as "Pa$$ta"
 * would change on the way in, and a value that itself holds "{n}" would be filled again by a later replace. A place with no
 * value is left as it is.
 */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (place, key: string) => (Object.hasOwn(values, key) ? String(values[key]) : place))
}

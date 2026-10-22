/** The first word of a name and the rest ('' when the name is one word). Runs of spaces count as one. */
export function splitFirstWord(name: string): [string, string] {
  const words = name.trim().split(/\s+/)
  return [words[0] ?? '', words.slice(1).join(' ')]
}

/** Trim, collapse whitespace, drop control characters. */
export function cleanText(value: string): string {
  return value
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A person's name: letters, spaces and . ' - only, starting with a letter. */
export const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u

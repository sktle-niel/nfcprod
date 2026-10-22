/** The path of a business's public menu. A slug is a-z, 0-9 and hyphens, so it goes in as it is. */
export function menuPath(slug: string): string {
  // Encoded all the same, so a slug that skipped its check cannot change the path. Lone surrogates would make
  // encodeURIComponent throw, so they become U+FFFD first.
  return `/m/${encodeURIComponent(slug.replace(/\p{Cs}/gu, '�'))}`
}

/** The full link written on the NFC card and in the QR code. `origin` is like "https://example.com"; a trailing slash is fine. */
export function menuUrl(slug: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}${menuPath(slug)}`
}

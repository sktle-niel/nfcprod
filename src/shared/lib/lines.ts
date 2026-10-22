import { cleanText } from './text'

/**
 * Text that keeps its line breaks, such as opening hours. Each line is cleaned like `cleanText` (control characters
 * out, runs of spaces collapsed, trimmed) and empty lines are dropped. Lines past `maxLines` are joined onto the last
 * one, so nothing the owner typed is lost.
 */
export function cleanLines(value: string, maxLines: number): string {
  const lines = value
    .split(/\r\n|\r|\n/)
    .map(cleanText)
    .filter((line) => line !== '')
  const keep = Math.max(1, Math.floor(maxLines))
  if (lines.length <= keep) return lines.join('\n')
  return [...lines.slice(0, keep - 1), lines.slice(keep - 1).join(' ')].join('\n')
}

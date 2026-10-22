import { fill } from '@/shared/lib/fill'

/**
 * The words that say where a row went, for example "Americano moved to 2 of 5". `at` is the new place, counted from 0.
 * The place is in the text so that moving the same row twice reads differently the second time.
 */
export function movedText(template: string, name: string, at: number, count: number): string {
  return fill(template, { name, n: at + 1, count })
}

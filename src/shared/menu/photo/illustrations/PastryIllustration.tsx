import { Art } from './Art'
import { SOFT } from './fills'

/** A pastry: a croissant on a board. */
export function PastryIllustration() {
  return (
    <Art>
      <path d="M5 42C8 28 20 19 32 19s24 9 27 23c-6 1-11-1-14-4-4 3-8 4-13 4s-9-1-13-4c-3 3-8 5-14 4z" {...SOFT} />
      <path d="M21 23c2 5 3 10 3 16M32 19v22M43 23c-2 5-3 10-3 16" />
      <path d="M10 50h44" />
    </Art>
  )
}

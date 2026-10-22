import { Art } from './Art'
import { SOFT } from './fills'

/** A hot drink: a round cup on a saucer, with steam. */
export function CupIllustration() {
  return (
    <Art>
      <path d="M24 21c-2.5-3 2.5-5 0-8.5M32 20c-2.5-3 2.5-5 0-8.5M40 21c-2.5-3 2.5-5 0-8.5" />
      <path d="M14 28h32v8a14 14 0 0 1-14 14h-4a14 14 0 0 1-14-14z" {...SOFT} />
      <path d="M46 31h3a6 6 0 0 1 0 12h-5.5" />
      <path d="M8 51h48a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" />
    </Art>
  )
}

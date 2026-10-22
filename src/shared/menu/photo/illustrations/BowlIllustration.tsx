import { Art } from './Art'
import { DEEP, SOFT } from './fills'

/** A bowl of food with a pair of chopsticks resting on it. */
export function BowlIllustration() {
  return (
    <Art>
      <path d="M38 27L55 8M43 29L59 13" />
      <path d="M14 32c1.5-7 9-11 18-11s16.5 4 18 11" {...DEEP} />
      <path d="M8 32h48a24 20 0 0 1-48 0" {...SOFT} />
      <path d="M25 51.5l-1 4h16l-1-4" />
    </Art>
  )
}

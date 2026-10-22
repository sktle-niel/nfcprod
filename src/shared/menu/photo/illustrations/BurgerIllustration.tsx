import { Art } from './Art'
import { DEEP, SOFT } from './fills'

/** A burger: a seeded bun, lettuce, a patty and the bottom bun. */
export function BurgerIllustration() {
  return (
    <Art>
      <path d="M10 30a22 17 0 0 1 44 0z" {...SOFT} />
      <path d="M24 20l2-1M31 17h2M39 20l2 1M28 24h1.5M36 24h1.5" />
      <path d="M8 35c3 3 5-3 8 0s5-3 8 0 5-3 8 0 5-3 8 0 5-3 8 0 5-3 8 0" />
      <rect x="10" y="39" width="44" height="7" rx="3.5" {...DEEP} />
      <path d="M10 50h44v1a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5z" {...SOFT} />
    </Art>
  )
}

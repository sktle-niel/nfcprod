import { Art } from './Art'
import { DEEP, SOFT } from './fills'

/** A cocktail: a stemmed glass with an olive on a pick. */
export function CocktailIllustration() {
  return (
    <Art>
      <path d="M17 19h30L32 34z" {...SOFT} stroke="none" />
      <path d="M11 14h42L32 36zM32 36v19M22 56h20" />
      <path d="M46 5L31 25" />
      <circle cx="36" cy="18" r="3.5" {...DEEP} />
    </Art>
  )
}

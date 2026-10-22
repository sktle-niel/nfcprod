import type { ComponentType } from 'react'
import { BowlIllustration } from './illustrations/BowlIllustration'
import { BobaIllustration } from './illustrations/BobaIllustration'
import { BurgerIllustration } from './illustrations/BurgerIllustration'
import { CocktailIllustration } from './illustrations/CocktailIllustration'
import { CupIllustration } from './illustrations/CupIllustration'
import { IcedIllustration } from './illustrations/IcedIllustration'
import { PastryIllustration } from './illustrations/PastryIllustration'
import { PlateIllustration } from './illustrations/PlateIllustration'
import { SliceIllustration } from './illustrations/SliceIllustration'
import type { PlaceholderKind } from './placeholders'

const ILLUSTRATIONS: Record<PlaceholderKind, ComponentType> = {
  cup: CupIllustration,
  iced: IcedIllustration,
  boba: BobaIllustration,
  bowl: BowlIllustration,
  plate: PlateIllustration,
  pastry: PastryIllustration,
  slice: SliceIllustration,
  burger: BurgerIllustration,
  cocktail: CocktailIllustration,
}

/** The flat illustration of a kind, drawn inline in `currentColor`. Decoration only: it is hidden from assistive technology. */
export function Illustration({ kind }: { kind: PlaceholderKind }) {
  const Drawing = ILLUSTRATIONS[kind]
  return <Drawing />
}

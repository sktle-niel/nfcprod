import type { ComponentType } from 'react'
import type { DecorKind } from '@/entities/theme/theme'
import { BakeryDecor } from './BakeryDecor'
import { BarDecor } from './BarDecor'
import { CoffeeDecor } from './CoffeeDecor'
import { DiningDecor } from './DiningDecor'
import { LeavesDecor } from './LeavesDecor'
import { SparklesDecor } from './SparklesDecor'

/** Every set of line art, by the name the theme gives it ('none' has no entry: nothing is drawn). One file each. */
export const DECOR_COMPONENTS: Record<Exclude<DecorKind, 'none'>, ComponentType> = {
  coffee: CoffeeDecor,
  leaves: LeavesDecor,
  dining: DiningDecor,
  bakery: BakeryDecor,
  bar: BarDecor,
  sparkles: SparklesDecor,
}

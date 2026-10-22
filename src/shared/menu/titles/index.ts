import type { ComponentType } from 'react'
import type { TitleKind } from '@/entities/theme/theme'
import { BulletsTitle } from './BulletsTitle'
import { OrnamentTitle } from './OrnamentTitle'
import { PlainTitle } from './PlainTitle'
import { RibbonTitle } from './RibbonTitle'
import { RuleTitle } from './RuleTitle'
import { ScriptTitle } from './ScriptTitle'
import { StripeTitle } from './StripeTitle'
import type { TitleProps } from './types'

/** Every kind of category title, by the name the theme gives it. One file each. */
export const TITLE_COMPONENTS: Record<TitleKind, ComponentType<TitleProps>> = {
  plain: PlainTitle,
  bullets: BulletsTitle,
  script: ScriptTitle,
  ribbon: RibbonTitle,
  ornament: OrnamentTitle,
  rule: RuleTitle,
  stripe: StripeTitle,
}

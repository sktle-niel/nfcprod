import { dashboardCopy } from '@/config/dashboardCopy'
import { BUSINESS_TYPES } from '@/entities/business/business'
import { STYLES } from '@/entities/theme/styles'
import type { StyleId } from '@/entities/theme/theme'
import { fill } from '@/shared/lib/fill'

const words = dashboardCopy.design.look

/** The owner-facing name of a style. */
export const styleName = (id: StyleId) => words.styles.names[id]

/** "Best for: Coffee shop, Bakery", in the words the owner chose their business types with. */
export function bestForLine(id: StyleId): string {
  const types = STYLES[id].bestFor
  if (BUSINESS_TYPES.every((type) => types.includes(type))) return words.styles.bestForAll
  const names = types.map((type) => dashboardCopy.setup.types[type].label).join(', ')
  return fill(words.styles.bestFor, { types: names })
}

import { useLook } from '../look'
import { CARD_COMPONENTS } from './index'
import type { CardProps } from './types'

/** One product, drawn as the menu's look says (`card` in the theme). */
export function ProductCard(props: CardProps) {
  const { card } = useLook()
  const Card = CARD_COMPONENTS[card]
  return <Card {...props} />
}

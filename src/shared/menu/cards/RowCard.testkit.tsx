import { render } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { Product } from '@/entities/menu/menu'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import { lookOf, LookProvider } from '../look'
import type { CardProps } from './types'

/** A product for the card tests: a plain one unless the patch says otherwise. */
export function sampleProduct(patch: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Spanish Latte',
    description: 'Espresso and steamed milk, sweetened with condensed milk.',
    price: 16500,
    variants: [],
    tags: [],
    available: true,
    image: null,
    groupIds: [],
    ...patch,
  }
}

/** Draws one card in a list, in the look of a theme, the way MenuView does. */
export function renderCard(
  Card: ComponentType<CardProps>,
  props: Partial<CardProps> = {},
  theme: Partial<Theme> = {},
) {
  return render(
    <LookProvider value={lookOf({ ...DEFAULT_THEME, ...theme })}>
      <ul>
        <Card product={sampleProduct()} as="h3" hasAddOns={false} photo={null} placeholder="cup" number={1} {...props} />
      </ul>
    </LookProvider>,
  )
}

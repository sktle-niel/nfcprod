import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import { readCss, ruleBody } from '@/test/css'
import { lookOf, LookProvider } from '../look'
import { PlateCard } from './PlateCard'

const text = copy.menu.view

function product(patch: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Kare-kare',
    description: 'Oxtail in peanut sauce',
    price: 48000,
    variants: [],
    tags: [],
    available: true,
    image: null,
    groupIds: [],
    ...patch,
  }
}

function renderCard(patch: Partial<Product> = {}, number = 3, photo: string | null = null) {
  return render(
    <LookProvider value={lookOf(styleTheme('gourmet', 'dark'))}>
      <ul>
        <PlateCard product={product(patch)} as="h3" hasAddOns={false} photo={photo} placeholder="plate" number={number} />
      </ul>
    </LookProvider>,
  )
}

describe('PlateCard', () => {
  it('numbers the dish from the card props, two digits, hidden from screen readers', () => {
    const { container } = renderCard({}, 3)
    const badge = within(container).getByText('03')
    expect(badge).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps two digits and never shows a number under one', () => {
    expect(within(renderCard({}, 12).container).getByText('12')).toBeInTheDocument()
    expect(within(renderCard({ id: 'p2' }, 0).container).getByText('01')).toBeInTheDocument()
  })

  it('draws the name as a heading, the price, the description and a list item', () => {
    renderCard()
    expect(screen.getByRole('heading', { level: 3, name: 'Kare-kare' })).toBeInTheDocument()
    expect(screen.getByText('Oxtail in peanut sauce')).toBeInTheDocument()
    expect(screen.getByText(/₱480/)).toBeInTheDocument()
    expect(screen.getByRole('listitem')).not.toHaveAttribute('data-sold-out')
  })

  it('says sold out in words and marks the card for the stylesheet', () => {
    renderCard({ available: false })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-sold-out', '')
  })

  it('shows the picture without text of its own, or the placeholder', () => {
    const { container } = renderCard({}, 1, 'https://images.example.com/dish.jpg')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})

describe('the PlateCard stylesheet', () => {
  it('draws every picture as a round plate, whatever the shape of the look', async () => {
    const css = await readCss('src/shared/menu/cards/PlateCard.module.css')
    const photo = ruleBody(css, '.card .plate .photo')
    expect(photo).toMatch(/border-radius:\s*50%/)
    expect(photo).toMatch(/object-fit:\s*cover/)
    expect(ruleBody(css, '.plate')).toMatch(/width:\s*96px/)
  })

  it('puts the number on the fill pair and strikes a sold-out price', async () => {
    const css = await readCss('src/shared/menu/cards/PlateCard.module.css')
    expect(ruleBody(css, '.number')).toMatch(/color:\s*var\(--menu-on-fill\)/)
    expect(ruleBody(css, '.number')).toMatch(/background:\s*var\(--menu-fill\)/)
    expect(ruleBody(css, '.card[data-sold-out] .price')).toMatch(/line-through/)
  })
})

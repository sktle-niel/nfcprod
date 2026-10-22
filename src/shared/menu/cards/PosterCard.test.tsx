import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import { readCss, rulesOf, ruleBody } from '@/test/css'
import { lookOf, LookProvider } from '../look'
import { PosterCard } from './PosterCard'

const text = copy.menu.view

function product(patch: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Spanish Latte',
    description: '',
    price: 16500,
    variants: [],
    tags: [],
    available: true,
    image: null,
    groupIds: [],
    ...patch,
  }
}

const SIZES = [
  { id: 'v1', label: '16oz', price: 4500 },
  { id: 'v2', label: '22oz', price: 5500 },
]

function renderCard(patch: Partial<Product> = {}) {
  return render(
    <LookProvider value={lookOf(styleTheme('roast', 'dark'))}>
      <ul>
        <PosterCard product={product(patch)} as="h4" hasAddOns placeholder="iced" photo={null} number={1} />
      </ul>
    </LookProvider>,
  )
}

describe('PosterCard', () => {
  it('lists the sizes as a small table of label and price, without a "From" line', () => {
    renderCard({ variants: SIZES, price: 4500 })
    expect(screen.getByRole('heading', { level: 4, name: 'Spanish Latte' })).toBeInTheDocument()
    const sizes = screen.getByText('16oz').closest('ul')
    expect(sizes).not.toBeNull()
    const rows = within(sizes as HTMLElement).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual(['16oz ₱45', '22oz ₱55'])
    expect(screen.queryByText(/From/)).toBeNull()
  })

  it('shows the price when the product has no sizes, and the add-ons note', () => {
    renderCard()
    expect(screen.getByText('₱165')).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
  })

  it('says sold out in words and marks the card', () => {
    renderCard({ available: false })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-sold-out', '')
  })
})

describe('the PosterCard stylesheet', () => {
  it('has no card color: the words use the page pair', async () => {
    const css = await readCss('src/shared/menu/cards/PosterCard.module.css')
    const card = ruleBody(css, '.card')
    expect(card).toMatch(/color:\s*var\(--menu-text\)/)
    expect(card).not.toMatch(/background/)
  })

  it('strikes every sold-out price', async () => {
    const css = await readCss('src/shared/menu/cards/PosterCard.module.css')
    const struck = rulesOf(css).find((rule) => rule.selector === '.card[data-sold-out] .price, .card[data-sold-out] .sizePrice')
    expect(struck?.declarations['text-decoration']).toBe('line-through')
  })

  it('leaves the columns of the list to the menu: the list belongs to MenuView, so the card does not reach for it', async () => {
    const css = await readCss('src/shared/menu/cards/PosterCard.module.css')
    expect(css).not.toMatch(/:has\(/)
    expect(rulesOf(css).filter((rule) => rule.selector.startsWith('ul'))).toEqual([])
  })
})

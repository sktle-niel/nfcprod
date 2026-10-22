import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import { readCss, ruleBody } from '@/test/css'
import { lookOf, LookProvider } from '../look'
import { BadgeCard } from './BadgeCard'

const text = copy.menu.view
const CSS = 'src/shared/menu/cards/BadgeCard.module.css'

function product(patch: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Iced Caramel Macchiato',
    description: 'Vanilla milk over ice, topped with espresso',
    price: 17500,
    variants: [],
    tags: [],
    available: true,
    image: null,
    groupIds: [],
    ...patch,
  }
}

function renderCard(patch: Partial<Product> = {}, photo: string | null = null, hasAddOns = false) {
  return render(
    <LookProvider value={lookOf(styleTheme('sunny', 'light'))}>
      <ul>
        <BadgeCard product={product(patch)} as="h3" hasAddOns={hasAddOns} photo={photo} placeholder="iced" number={1} />
      </ul>
    </LookProvider>,
  )
}

describe('BadgeCard', () => {
  it('draws the name as the first heading of the card, then the price as a bare amount on the badge', () => {
    const { container } = renderCard()
    const item = screen.getByRole('listitem')
    const heading = within(item).getByRole('heading', { level: 3, name: 'Iced Caramel Macchiato' })
    const badge = within(item).getByText('₱175')
    // The name comes first in the document; the stylesheet only lifts the picture above it.
    expect(heading.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('[data-shape]')).toHaveAttribute('aria-hidden', 'true')
    expect(item).not.toHaveAttribute('data-sold-out')
  })

  it('puts the lowest size on the badge and lists every size under the name', () => {
    renderCard({
      variants: [
        { id: 'l', label: 'L', price: 21500 },
        { id: 's', label: 'S', price: 17500 },
      ],
    })
    expect(screen.getByText('₱175')).toBeInTheDocument()
    expect(screen.getByText('L ₱215 · S ₱175')).toBeInTheDocument()
  })

  it('says sold out in words and marks the card for the stylesheet', () => {
    renderCard({ available: false })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-sold-out', '')
  })

  it('shows tags and the add-ons note when they apply', () => {
    renderCard({ tags: ['bestSeller'] }, null, true)
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
  })

  it('shows the picture without text of its own', () => {
    const { container } = renderCard({}, 'https://images.example.com/drink.png')
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
  })
})

describe('the BadgeCard stylesheet', () => {
  it('stands the picture on a pedestal of the accent, under the picture', async () => {
    const css = await readCss(CSS)
    const pedestal = ruleBody(css, '.stage::before')
    expect(pedestal).toMatch(/border-radius:\s*50%/)
    expect(pedestal).toMatch(/color-mix\(in srgb, var\(--menu-accent\)/)
    expect(ruleBody(css, '.photo')).toMatch(/z-index:\s*1/)
    expect(ruleBody(css, '.stage')).toMatch(/order:\s*-1/)
  })

  it('draws the price as a round badge in the fill pair, kept inside the column', async () => {
    const css = await readCss(CSS)
    const badge = ruleBody(css, '.badge')
    expect(badge).toMatch(/color:\s*var\(--menu-on-fill\)/)
    expect(badge).toMatch(/background:\s*var\(--menu-fill\)/)
    expect(badge).toMatch(/border-radius:\s*999px/)
    expect(badge).toMatch(/right:\s*0;/)
    expect(badge).toMatch(/white-space:\s*nowrap/)
  })

  it('keeps the description to two lines and strikes a sold-out price', async () => {
    const css = await readCss(CSS)
    expect(ruleBody(css, '.description')).toMatch(/line-clamp:\s*2/)
    expect(ruleBody(css, '.card[data-sold-out] .badge')).toMatch(/line-through/)
    expect(ruleBody(css, '.card[data-sold-out] .photo')).toMatch(/grayscale\(1\)/)
  })
})

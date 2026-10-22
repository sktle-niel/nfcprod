import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import { readCss, ruleBody } from '@/test/css'
import { lookOf, LookProvider } from '../look'
import { SoftCard } from './SoftCard'

const text = copy.menu.view
const CSS = 'src/shared/menu/cards/SoftCard.module.css'

function product(patch: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Coffee Cake',
    description: 'Salted coffee and a pastry of your choice',
    price: 7000,
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
    <LookProvider value={lookOf(styleTheme('cocoa', 'dark'))}>
      <ul>
        <SoftCard product={product(patch)} as="h3" hasAddOns={hasAddOns} photo={photo} placeholder="pastry" number={1} />
      </ul>
    </LookProvider>,
  )
}

describe('SoftCard', () => {
  it('draws the name as a heading, the description as a subtitle and the price as text', () => {
    renderCard()
    const item = screen.getByRole('listitem')
    const heading = within(item).getByRole('heading', { level: 3, name: 'Coffee Cake' })
    const price = within(item).getByText('₱70')
    expect(within(item).getByText('Salted coffee and a pastry of your choice')).toBeInTheDocument()
    expect(heading.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(item).not.toHaveAttribute('data-sold-out')
  })

  it('shows the sizes and a price that starts from the lowest', () => {
    renderCard({
      variants: [
        { id: 'r', label: 'Regular', price: 7000 },
        { id: 'b', label: 'Big', price: 9000 },
      ],
    })
    expect(screen.getByText('Regular ₱70 · Big ₱90')).toBeInTheDocument()
    expect(screen.getByText(text.from.replace('{price}', '₱70'))).toBeInTheDocument()
  })

  it('says sold out in words and marks the card for the stylesheet', () => {
    renderCard({ available: false })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-sold-out', '')
  })

  it('shows tags, the add-ons note, and the picture or its placeholder without text', () => {
    const { container, unmount } = renderCard({ tags: ['bestSeller'] }, null, true)
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
    expect(container.querySelector('[data-shape]')).toHaveAttribute('aria-hidden', 'true')
    unmount()
    expect(renderCard({}, 'https://images.example.com/cake.webp').container.querySelector('img')).toHaveAttribute('alt', '')
  })
})

describe('the SoftCard stylesheet', () => {
  it('is a filled card in the card pair that never clips the picture over its edge', async () => {
    const css = await readCss(CSS)
    const card = ruleBody(css, '.card')
    expect(card).toMatch(/color:\s*var\(--menu-on-surface\)/)
    expect(card).toMatch(/background:\s*var\(--menu-surface\)/)
    expect(card).not.toMatch(/overflow/)
    expect(card).toMatch(/margin-top:\s*var\(--card-rise\)/)
    // The picture reaches past the right edge by less than the section's 16px side padding: no sideways scroll.
    expect(ruleBody(css, '.visual')).toMatch(/margin:\s*calc\(-1 \* \(var\(--card-pad\) \+ var\(--card-rise\)\)\) -10px/)
    // A placeholder sits on the card: it is drawn in the card's muted color, not the page's.
    expect(ruleBody(css, '.card .photo')).toMatch(/color:\s*var\(--menu-card-muted\)/)
  })

  it('tilts the price tag, in the fill pair, and strikes it when sold out', async () => {
    const css = await readCss(CSS)
    const price = ruleBody(css, '.price')
    expect(price).toMatch(/color:\s*var\(--menu-on-fill\)/)
    expect(price).toMatch(/background:\s*var\(--menu-fill\)/)
    expect(price).toMatch(/rotate\(-4deg\)/)
    expect(ruleBody(css, '.card[data-sold-out] .price')).toMatch(/line-through/)
    expect(ruleBody(css, '.card[data-sold-out] .photo')).toMatch(/grayscale\(1\)/)
  })
})

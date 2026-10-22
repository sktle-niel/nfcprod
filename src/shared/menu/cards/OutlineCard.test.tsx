import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import { readCss, ruleBody } from '@/test/css'
import { lookOf, LookProvider } from '../look'
import { OutlineCard } from './OutlineCard'

const text = copy.menu.view
const CSS = 'src/shared/menu/cards/OutlineCard.module.css'

function product(patch: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    categoryId: 'c1',
    name: 'Caramel Macchiato',
    description: 'Espresso, milk and caramel',
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
    <LookProvider value={lookOf(styleTheme('atelier', 'dark'))}>
      <ul>
        <OutlineCard product={product(patch)} as="h4" hasAddOns={hasAddOns} photo={photo} placeholder="iced" number={1} />
      </ul>
    </LookProvider>,
  )
}

describe('OutlineCard', () => {
  it('draws the name as a heading, the description and the price as text', () => {
    renderCard()
    const item = screen.getAllByRole('listitem')[0]!
    expect(within(item).getByRole('heading', { level: 4, name: 'Caramel Macchiato' })).toBeInTheDocument()
    expect(within(item).getByText('Espresso, milk and caramel')).toBeInTheDocument()
    expect(within(item).getByText('₱175')).toBeInTheDocument()
    expect(item).not.toHaveAttribute('data-sold-out')
  })

  it('lists the sizes as their own list and says the price starts from the lowest', () => {
    renderCard({
      variants: [
        { id: 's', label: 'S', price: 15500 },
        { id: 'l', label: 'L', price: 19500 },
      ],
    })
    const sizes = screen.getAllByRole('list')[1]!
    expect(within(sizes).getAllByRole('listitem')).toHaveLength(2)
    expect(within(sizes).getByText('S')).toBeInTheDocument()
    expect(within(sizes).getByText('₱195')).toBeInTheDocument()
    expect(screen.getByText(text.from.replace('{price}', '₱155'))).toBeInTheDocument()
  })

  it('says sold out in words and marks the card for the stylesheet', () => {
    renderCard({ available: false })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-sold-out', '')
  })

  it('shows tags, the add-ons note, and the picture without text of its own', () => {
    const { container } = renderCard({ tags: ['new'] }, 'https://images.example.com/drink.png', true)
    expect(screen.getByText(text.tags.new)).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})

describe('the OutlineCard stylesheet', () => {
  it('is an outline with no fill and never clips the picture that reaches past its edge', async () => {
    const css = await readCss(CSS)
    const card = ruleBody(css, '.card')
    expect(card).toMatch(/border:\s*1px solid/)
    expect(card).not.toMatch(/background/)
    expect(card).not.toMatch(/overflow/)
    expect(card).toMatch(/color:\s*var\(--menu-text\)/)
    // The picture reaches past the right edge by less than the section's 16px side padding: no sideways scroll.
    expect(ruleBody(css, '.photo')).toMatch(/margin:\s*calc\(-1 \* \(var\(--card-pad\) \+ var\(--card-rise\)\)\) -12px/)
    // The card keeps room above for the picture that rises over its top edge.
    expect(card).toMatch(/margin-top:\s*var\(--card-rise\)/)
  })

  it('draws the price as a filled pill in the fill pair and strikes it when sold out', async () => {
    const css = await readCss(CSS)
    const price = ruleBody(css, '.price')
    expect(price).toMatch(/color:\s*var\(--menu-on-fill\)/)
    expect(price).toMatch(/background:\s*var\(--menu-fill\)/)
    expect(ruleBody(css, '.card[data-sold-out] .price')).toMatch(/line-through/)
    expect(ruleBody(css, '.card[data-sold-out] .photo')).toMatch(/grayscale\(1\)/)
  })

  it('writes the name in capitals in the display font', async () => {
    const name = ruleBody(await readCss(CSS), '.name')
    expect(name).toMatch(/text-transform:\s*uppercase/)
    expect(name).toMatch(/font-family:\s*var\(--menu-display\)/)
  })
})

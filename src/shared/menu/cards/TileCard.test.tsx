import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { readCss, ruleBody } from '@/test/css'
import { TileCard } from './TileCard'
import { renderCard, sampleProduct } from './RowCard.testkit'

const text = copy.menu.view
const FILE = 'src/shared/menu/cards/TileCard.module.css'
const LONG = 'Espresso and steamed milk, sweetened with condensed milk, then topped with a cloud of cold foam and a pinch of sea salt.'

describe('TileCard', () => {
  it('puts the picture on top, then the name, the sizes, the whole description, and the price last', () => {
    const product = sampleProduct({
      description: LONG,
      variants: [
        { id: 'v1', label: 'S', price: 16500 },
        { id: 'v2', label: 'M', price: 18500 },
      ],
    })
    const { container } = renderCard(TileCard, { product }, { photo: 'arch' })
    const item = container.querySelector('li')!
    expect(item.firstElementChild?.querySelector('[data-shape="arch"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'Spanish Latte' })).toBeInTheDocument()
    expect(screen.getByText('S ₱165 · M ₱185')).toBeInTheDocument()
    expect(screen.getByText(LONG)).toBeInTheDocument()
    const body = item.lastElementChild!
    expect(body.lastElementChild).toHaveTextContent('From ₱165')
  })

  it('shows the tags and the add-ons note', () => {
    renderCard(TileCard, { product: sampleProduct({ tags: ['bestSeller'] }), hasAddOns: true })
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
  })

  it('draws a real picture as lazy decoration', () => {
    const { container } = renderCard(TileCard, { photo: 'https://images.example.com/latte.jpg' })
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })

  it('says sold out in words and marks the tile', () => {
    const { container } = renderCard(TileCard, { product: sampleProduct({ available: false }) })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(container.querySelector('li')).toHaveAttribute('data-sold-out')
  })
})

describe('the TileCard stylesheet', () => {
  it('draws the tile on the card color with the card text', async () => {
    const tile = ruleBody(await readCss(FILE), '.tile')
    expect(tile).toMatch(/color:\s*var\(--menu-on-surface\)/)
    expect(tile).toMatch(/background:\s*var\(--menu-surface\)/)
  })

  it('draws the placeholder in the card pair, not the page pair', async () => {
    expect(ruleBody(await readCss(FILE), '.photo')).toMatch(/color:\s*var\(--menu-card-muted\)/)
  })

  it('cuts the description to two drawn lines', async () => {
    const description = ruleBody(await readCss(FILE), '.description')
    expect(description).toMatch(/-webkit-line-clamp:\s*2/)
    expect(description).toMatch(/overflow:\s*hidden/)
  })

  it('puts the price in a chip of the fill pair at the foot of the tile', async () => {
    const price = ruleBody(await readCss(FILE), '.price')
    expect(price).toMatch(/color:\s*var\(--menu-on-fill\)/)
    expect(price).toMatch(/background:\s*var\(--menu-fill\)/)
    expect(price).toMatch(/margin:\s*auto 0 0/)
  })

  it('lays the tile on its side in the list layout', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, ":global([data-menu-layout='list']) .tile")).toMatch(/flex-direction:\s*row/)
    expect(ruleBody(css, ":global([data-menu-layout='list']) .stage")).toMatch(/width:\s*112px/)
  })
})

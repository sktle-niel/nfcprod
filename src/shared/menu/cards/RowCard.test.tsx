import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { PHOTOS } from '@/entities/theme/theme'
import { readCss, rulesOf } from '@/test/css'
import { RowCard } from './RowCard'
import { renderCard, sampleProduct } from './RowCard.testkit'

const text = copy.menu.view
const PHOTO = 'https://images.example.com/latte.jpg'
const FILE = 'src/shared/menu/cards/RowCard.module.css'

describe('RowCard', () => {
  it('shows the name as a heading, the description, the price, the sizes, the tags and the add-ons note', () => {
    const product = sampleProduct({
      variants: [
        { id: 'v1', label: 'S', price: 16500 },
        { id: 'v2', label: 'M', price: 18500 },
      ],
      tags: ['bestSeller'],
    })
    renderCard(RowCard, { product, hasAddOns: true })
    expect(screen.getByRole('heading', { level: 3, name: 'Spanish Latte' })).toBeInTheDocument()
    expect(screen.getByText('Espresso and steamed milk, sweetened with condensed milk.')).toBeInTheDocument()
    expect(screen.getByText('From ₱165')).toBeInTheDocument()
    expect(screen.getByText('S ₱165 · M ₱185')).toBeInTheDocument()
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
  })

  it('says sold out in words and marks the card, so its stylesheet can strike the price', () => {
    renderCard(RowCard, { product: sampleProduct({ available: false }) })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveAttribute('data-sold-out')
  })

  it.each(PHOTOS)('draws the picture in the %s shape, as lazy decoration', (photo) => {
    const { container } = renderCard(RowCard, { photo: PHOTO }, { photo })
    const picture = container.querySelector('img')
    expect(picture).toHaveAttribute('data-shape', photo)
    expect(picture).toHaveAttribute('alt', '')
    expect(picture).toHaveAttribute('loading', 'lazy')
  })

  it.each(PHOTOS)('draws the placeholder in the %s shape when there is no picture', (photo) => {
    const { container } = renderCard(RowCard, {}, { photo })
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector(`[data-shape="${photo}"]`)).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('the RowCard stylesheet', () => {
  it('rounds or squares a corner only for the shape it names: a bare photo rule would square a circle or an arch', async () => {
    const rules = rulesOf(await readCss(FILE)).filter((rule) => /\.photo\b/.test(rule.selector) && rule.declarations['border-radius'] !== undefined)
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) expect(rule.selector).toMatch(/\[data-shape='rounded'\]/)
  })

  it('draws the placeholder in the card pair, not the page pair', async () => {
    const photo = rulesOf(await readCss(FILE)).find((rule) => rule.selector === '.photo')
    expect(photo?.declarations['color']).toBe('var(--menu-card-muted)')
  })

  it('centers the shapes that are not a rectangle above the text, and keeps the list picture at 88px on the right', async () => {
    const rules = rulesOf(await readCss(FILE))
    const centered = rules.find((rule) => rule.selector.includes(".photo[data-shape='circle']"))
    expect(centered?.declarations['align-self']).toBe('center')
    expect(centered?.selector).toContain(".photo[data-shape='arch']")
    const list = rules.find((rule) => rule.selector === ":global([data-menu-layout='list']) .photo")
    expect(list?.declarations['width']).toBe('88px')
    expect(list?.declarations['order']).toBe('1')
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { readCss, ruleBody } from '@/test/css'
import { LeaderCard } from './LeaderCard'
import { renderCard, sampleProduct } from './RowCard.testkit'

const text = copy.menu.view
const FILE = 'src/shared/menu/cards/LeaderCard.module.css'

const sized = sampleProduct({
  variants: [
    { id: 'v1', label: 'S', price: 16500 },
    { id: 'v2', label: 'M', price: 18500 },
  ],
  tags: ['new'],
})

describe('LeaderCard', () => {
  it('reads as the name, then the price: the dots are not text', () => {
    const { container } = renderCard(LeaderCard, { product: sized })
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent(/^Spanish Latte$/)
    expect(screen.getByText('From ₱165')).toBeInTheDocument()
    expect(container.querySelector('li')?.textContent).not.toMatch(/\.{2,}|…|·{2,}/)
  })

  it('lists each size with its price, and shows the description, the tags and the add-ons note', () => {
    renderCard(LeaderCard, { product: sized, hasAddOns: true })
    const sizes = screen.getAllByRole('list')[1]!
    expect(within(sizes).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['S ₱165', 'M ₱185'])
    expect(screen.getByText('Espresso and steamed milk, sweetened with condensed milk.')).toBeInTheDocument()
    expect(screen.getByText(text.tags.new)).toBeInTheDocument()
    expect(screen.getByText(text.addOnsAvailable)).toBeInTheDocument()
  })

  it('draws a picture or its placeholder before the name', () => {
    const { container } = renderCard(LeaderCard, {}, { photo: 'circle' })
    const item = container.querySelector('li')!
    expect(item.firstElementChild).toHaveAttribute('data-shape', 'circle')
    expect(item.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('says sold out in words and marks the line', () => {
    const { container } = renderCard(LeaderCard, { product: sampleProduct({ available: false }) })
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
    expect(container.querySelector('li')).toHaveAttribute('data-sold-out')
  })
})

describe('the LeaderCard stylesheet', () => {
  it('has no card: the text is the page text, with no ground of its own', async () => {
    const item = ruleBody(await readCss(FILE), '.item')
    expect(item).toMatch(/color:\s*var\(--menu-text\)/)
    expect(item).not.toMatch(/background/)
  })

  it('draws the dots as a dotted border across the line, hidden behind the words and the price by the page color', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, '.line::before')).toMatch(/border-bottom:\s*2px dotted var\(--menu-muted\)/)
    expect(ruleBody(css, '.nameText')).toMatch(/background:\s*var\(--menu-bg\)/)
    expect(ruleBody(css, '.nameText')).toMatch(/box-decoration-break:\s*clone/)
    expect(ruleBody(css, '.price')).toMatch(/background:\s*var\(--menu-bg\)/)
  })

  it('keeps the price on one line at the right, in tabular numbers, and strikes it when sold out', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, '.line')).toMatch(/justify-content:\s*space-between/)
    expect(ruleBody(css, '.price')).toMatch(/font-variant-numeric:\s*tabular-nums/)
    expect(ruleBody(css, '.price')).toMatch(/white-space:\s*nowrap/)
    expect(ruleBody(css, '.item[data-sold-out] .price')).toMatch(/line-through/)
  })

  it('draws the picture at 40px, round for every framed shape', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, '.photo')).toMatch(/width:\s*40px/)
    expect(ruleBody(css, ".photo:not([data-shape='cutout'])")).toMatch(/border-radius:\s*50%/)
  })
})

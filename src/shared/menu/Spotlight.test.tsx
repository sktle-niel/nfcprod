import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import type { StyleId } from '@/entities/theme/theme'
import { readCss, ruleBody } from '@/test/css'
import { lookOf, LookProvider } from './look'
import { Spotlight } from './Spotlight'

const text = copy.menu.view

const PRODUCT: Product = {
  id: 'p1',
  categoryId: 'c1',
  name: 'Choco Boba',
  description: 'Chocolate milk tea with pearls',
  price: 14500,
  variants: [
    { id: 'v1', label: 'M', price: 14500 },
    { id: 'v2', label: 'L', price: 16500 },
  ],
  tags: ['bestSeller'],
  available: true,
  image: null,
  groupIds: [],
}

function renderPanel(style: StyleId, as: 'h2' | 'h3' = 'h2') {
  return render(
    <LookProvider value={lookOf(styleTheme(style, 'dark'))}>
      <Spotlight product={PRODUCT} photo={null} placeholder="boba" as={as} />
    </LookProvider>,
  )
}

describe('Spotlight', () => {
  it('shows the best seller label, the name at the level it is given, the description, the price and the sizes', () => {
    renderPanel('editorial', 'h3')
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Choco Boba' })).toBeInTheDocument()
    expect(screen.getByText('Chocolate milk tea with pearls')).toBeInTheDocument()
    expect(screen.getByText(text.from.replace('{price}', '₱145'))).toBeInTheDocument()
    expect(screen.getByText('M ₱145 · L ₱165')).toBeInTheDocument()
    expect(screen.getByRole('article')).not.toHaveAttribute('data-sold-out')
  })

  it('draws the placeholder, with no text of its own, when there is no picture', () => {
    const { container } = renderPanel('atelier')
    expect(container.querySelector('[data-shape][aria-hidden="true"]')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('uses the script label when the category titles are script, and a chip otherwise', () => {
    const atelier = renderPanel('atelier')
    expect(screen.getByText(text.tags.bestSeller)).toHaveAttribute('data-label', 'script')
    atelier.unmount()
    renderPanel('retro')
    expect(screen.getByText(text.tags.bestSeller)).toHaveAttribute('data-label', 'chip')
  })
})

describe('the Spotlight stylesheet', () => {
  it('is a panel in the card color with the card text color, and a chip on the fill pair', async () => {
    const css = await readCss('src/shared/menu/Spotlight.module.css')
    expect(ruleBody(css, '.panel')).toMatch(/color:\s*var\(--menu-on-surface\)/)
    expect(ruleBody(css, '.panel')).toMatch(/background:\s*var\(--menu-surface\)/)
    expect(ruleBody(css, '.label')).toMatch(/background:\s*var\(--menu-fill\)/)
    expect(ruleBody(css, '.script')).toMatch(/font-family:\s*var\(--menu-script\)/)
  })

  it('lays the picture beside the words only when the menu is wide', async () => {
    const css = await readCss('src/shared/menu/Spotlight.module.css')
    expect(ruleBody(css, '.panel')).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/)
    expect(css).toContain('@container (min-width: 520px)')
  })
})

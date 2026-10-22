import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, HEADERS, type HeaderKind } from '@/entities/theme/theme'
import { lookOf, LookProvider } from '../look'
import { MenuHeader } from './MenuHeader'
import type { HeaderProps } from './types'

const LOGO = 'https://images.example.com/logo.png'

function renderHeader(header: HeaderKind, business: Partial<HeaderProps['business']> = {}, as: HeaderProps['as'] = 'h1') {
  return render(
    <LookProvider value={lookOf({ ...DEFAULT_THEME, header })}>
      <MenuHeader as={as} business={{ name: 'Kape Kanto', tagline: 'Coffee on the corner', logo: null, ...business }} />
    </LookProvider>,
  )
}

describe('the menu headers', () => {
  it.each(HEADERS)('draws "%s" with the name as the one heading, at the level asked, and the tagline', (header) => {
    const { container } = renderHeader(header, {}, 'h2')
    expect(screen.getByRole('heading', { level: 2, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1)
    expect(screen.getByText('Coffee on the corner')).toBeInTheDocument()
    expect(container.querySelector('header')).not.toBeNull()
  })

  it.each(HEADERS)('leaves the tagline out of "%s" when there is none', (header) => {
    const { container } = renderHeader(header, { tagline: '' })
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it.each(HEADERS)('shows the logo in "%s" as decoration when there is one', (header) => {
    const { container } = renderHeader(header, { logo: LOGO })
    const pictures = container.querySelectorAll('img')
    expect(pictures).toHaveLength(1)
    expect(pictures[0]).toHaveAttribute('src', LOGO)
    expect(pictures[0]).toHaveAttribute('alt', '')
  })

  it.each(HEADERS)('draws no logo in "%s" for an address the page may not show', (header) => {
    const { container } = renderHeader(header, { logo: 'javascript:alert(1)' })
    expect(container.querySelector('img')).toBeNull()
  })

  it.each(HEADERS)('hides every drawing of "%s" from screen readers', (header) => {
    const { container } = renderHeader(header)
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it.each(HEADERS)('keeps a name with markup as plain text in "%s"', (header) => {
    const { container } = renderHeader(header, { name: '<img src=x onerror=alert(1)>' })
    expect(screen.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('draws the awning as a hidden shape above the name', () => {
    const { container } = renderHeader('awning')
    const header = container.querySelector('header')
    expect(header?.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(header?.firstElementChild?.textContent).toBe('')
  })

  it('puts two sparkle stars around the poster name, without changing what the heading reads', () => {
    renderHeader('poster', { name: 'Romeo Coffee' })
    const heading = screen.getByRole('heading', { level: 1, name: 'Romeo Coffee' })
    expect(heading.querySelectorAll('svg')).toHaveLength(2)
  })
})

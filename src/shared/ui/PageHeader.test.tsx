import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('has the title as the one h1, and the actions next to it', () => {
    render(
      <PageHeader title="Orders">
        <button type="button">Export</button>
      </PageHeader>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('shows a subtitle under the title, outside the heading', () => {
    render(<PageHeader title="Overview" subtitle="Kape Kanto" />)
    expect(screen.getByText('Kape Kanto')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('Overview')
  })

  it('draws no subtitle when there is none', () => {
    const { container } = render(<PageHeader title="Overview" subtitle="" />)
    expect(container.querySelector('p')).toBeNull()
  })
})

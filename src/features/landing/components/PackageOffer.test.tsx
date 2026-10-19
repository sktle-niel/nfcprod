import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createMockAuth } from '@/data/auth'
import { DEFAULT_PRICES } from '@/data/pricing'
import type { Prices } from '@/entities/pricing/pricing'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { PackageOffer, type Billing } from './PackageOffer'

function renderOffer(billing: Billing, prices: Prices | null = DEFAULT_PRICES) {
  render(
    <SessionProvider repository={createMockAuth({ delay: 0 })}>
      <MemoryRouter>
        <PackageOffer billing={billing} prices={prices} index={2} />
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('PackageOffer', () => {
  it('shows the annual plan with its saving', () => {
    renderOffer('year')
    expect(screen.getByText('Annual')).toBeInTheDocument()
    expect(screen.getByText('₱3,999')).toBeInTheDocument()
    expect(screen.getByText('/year')).toBeInTheDocument()
    expect(screen.getByText('About ₱333 a month. You save ₱1,749.')).toBeInTheDocument()
    expect(screen.getByText('Save 30%')).toBeInTheDocument()
  })

  it('shows the monthly plan without a saving', () => {
    renderOffer('month')
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('₱479')).toBeInTheDocument()
    expect(screen.getByText('/month')).toBeInTheDocument()
    expect(screen.getByText('Billed every month.')).toBeInTheDocument()
    expect(screen.queryByText('Save 30%')).not.toBeInTheDocument()
  })

  it('drops the Save mark when a year saves nothing', () => {
    renderOffer('year', { card: 37900, month: 40000, year: 480000 })
    expect(screen.getByText('₱4,800')).toBeInTheDocument()
    expect(screen.getByText('Billed once a year.')).toBeInTheDocument()
    expect(screen.queryByText(/Save \d+%/)).not.toBeInTheDocument()
  })

  it('shows a dash while the prices load', () => {
    renderOffer('year', null)
    expect(screen.getByText('₱—')).toBeInTheDocument()
  })
})

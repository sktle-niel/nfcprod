import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createMockAuth } from '@/data/auth'
import { DEFAULT_PRICING } from '@/data/pricing'
import type { Pricing } from '@/entities/pricing/pricing'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { PackageOffer, type Billing } from './PackageOffer'

function renderOffer(billing: Billing, pricing: Pricing | null = DEFAULT_PRICING) {
  render(
    <SessionProvider repository={createMockAuth({ delay: 0 })}>
      <MemoryRouter>
        <PackageOffer billing={billing} pricing={pricing} index={2} />
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('PackageOffer', () => {
  it('shows the annual plan with its saving and its included items', () => {
    renderOffer('year')
    expect(screen.getByText('Annual')).toBeInTheDocument()
    expect(screen.getByText('₱3,999')).toBeInTheDocument()
    expect(screen.getByText('/year')).toBeInTheDocument()
    expect(screen.getByText('About ₱333 a month. You save ₱1,749.')).toBeInTheDocument()
    expect(screen.getByText('Save 30%')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(DEFAULT_PRICING.year.perks)
  })

  it('shows the monthly plan without a saving', () => {
    renderOffer('month')
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('₱479')).toBeInTheDocument()
    expect(screen.getByText('Billed every month.')).toBeInTheDocument()
    expect(screen.queryByText('Save 30%')).not.toBeInTheDocument()
  })

  it('shows a discount: the regular price struck through, the price to pay, and the mark', () => {
    renderOffer('month', { ...DEFAULT_PRICING, month: { ...DEFAULT_PRICING.month, discount: 20 } })
    expect(screen.getByText('20% off')).toBeInTheDocument()
    expect(screen.getByText('₱383')).toBeInTheDocument()
    expect(screen.getByText('₱479', { exact: false }).closest('del')).toHaveTextContent('Regular price ₱479')
  })

  it('drops the Save mark when a year saves nothing', () => {
    renderOffer('year', {
      ...DEFAULT_PRICING,
      month: { ...DEFAULT_PRICING.month, price: 40000 },
      year: { ...DEFAULT_PRICING.year, price: 480000 },
    })
    expect(screen.getByText('₱4,800')).toBeInTheDocument()
    expect(screen.getByText('Billed once a year.')).toBeInTheDocument()
    expect(screen.queryByText(/Save \d+%/)).not.toBeInTheDocument()
  })

  it('shows a dash while the offers load', () => {
    renderOffer('year', null)
    expect(screen.getByText('₱—')).toBeInTheDocument()
  })
})

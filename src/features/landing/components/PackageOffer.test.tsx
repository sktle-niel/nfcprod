import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createMockAuth } from '@/data/auth'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { packagePlans } from '../landing.data'
import { PackageOffer } from './PackageOffer'

function renderOffer() {
  render(
    <SessionProvider repository={createMockAuth({ delay: 0 })}>
      <MemoryRouter>
        <PackageOffer />
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('PackageOffer', () => {
  it('prices a year under ₱4,000, at least 30% less than 12 months', () => {
    expect(packagePlans).toEqual({ month: 47900, year: 399900 })
    expect(1 - packagePlans.year / (packagePlans.month * 12)).toBeGreaterThanOrEqual(0.3)
  })

  it('opens on the year and switches to the monthly price', async () => {
    const user = userEvent.setup()
    renderOffer()
    expect(screen.getByRole('radio', { name: /1 year/ })).toBeChecked()
    expect(screen.getByText('₱3,999')).toBeInTheDocument()
    expect(screen.getByText('/year')).toBeInTheDocument()
    expect(screen.getByText('About ₱333 a month. You save ₱1,749.')).toBeInTheDocument()
    expect(screen.getByText('Save 30%')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '1 month' }))
    expect(screen.getByText('₱479')).toBeInTheDocument()
    expect(screen.getByText('/month')).toBeInTheDocument()
    expect(screen.getByText('Billed every month.')).toBeInTheDocument()
  })
})

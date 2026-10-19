import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createMockAuth } from '@/data/auth'
import { createMockBilling, type BillingRepository } from '@/data/billing'
import { createMockPricing } from '@/data/pricing'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { DashboardPage } from './DashboardPage'

const NOW = Date.parse('2026-10-19T02:00:00Z')
const DAY = 86_400_000

async function renderPage({ at = NOW, billing }: { at?: number; billing?: (auth: ReturnType<typeof createMockAuth>) => BillingRepository } = {}) {
  const auth = createMockAuth({ delay: 0 })
  await auth.signUp({ name: 'Ana Cruz', email: 'ana@example.com', password: 'long enough' })
  const repository = billing ? billing(auth) : createMockBilling(auth, { delay: 0, now: () => NOW })
  render(
    <SessionProvider repository={auth}>
      <MemoryRouter>
        <DashboardPage billing={repository} pricing={createMockPricing()} now={() => at} />
      </MemoryRouter>
    </SessionProvider>,
  )
  await screen.findByRole('heading', { name: 'Choose your plan' })
}

describe('DashboardPage', () => {
  it('shows a new owner on the free trial, with the plans and the free cards', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Free trial: 7 days left' })).toBeInTheDocument()
    expect(screen.getByText('Your menu website is live until Oct 26, 2026. Start a plan to keep it on.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Annual/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Monthly/ })).toHaveAccessibleName(/₱479/)
    expect(screen.getByRole('heading', { name: '2 free NFC cards' })).toBeInTheDocument()
    expect(screen.getByText(/We send them for free when your plan starts/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Your menu website/ })).toHaveTextContent('Live')
  })

  it('starts the plan the owner picks', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('radio', { name: /Monthly/ }))
    await user.click(screen.getByRole('button', { name: 'Start monthly plan' }))
    expect(await screen.findByRole('heading', { name: 'Monthly plan is active' })).toBeInTheDocument()
    expect(screen.getByText('Renews on Nov 19, 2026.')).toBeInTheDocument()
    expect(screen.getByText(/We will call you to confirm where to send them/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start/ })).not.toBeInTheDocument()
  })

  it('pauses the menu once the trial is over', async () => {
    await renderPage({ at: NOW + 8 * DAY })
    expect(screen.getByRole('heading', { name: 'Your free trial has ended' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Your menu website/ })).toHaveTextContent('Paused')
  })

  it('stays put and says so when the checkout cannot open', async () => {
    const user = userEvent.setup()
    await renderPage({
      billing: (auth) => {
        const real = createMockBilling(auth, { delay: 0, now: () => NOW })
        return { current: () => real.current(), startCheckout: async () => ({ kind: 'redirect', url: 'https://evil.example/pay' }) }
      },
    })
    await user.click(screen.getByRole('button', { name: 'Start annual plan' }))
    expect(await screen.findByText('Could not open the checkout. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Free trial: 7 days left' })).toBeInTheDocument()
  })
})

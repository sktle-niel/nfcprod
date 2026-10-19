import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createMockAuth } from '@/data/auth'
import { DEFAULT_PRICING } from '@/data/pricing'
import type { Offer } from '@/entities/pricing/pricing'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { CardOffer } from './CardOffer'

async function setup({ offer = DEFAULT_PRICING.card, path = '/', signedIn = true }: { offer?: Offer | null; path?: string; signedIn?: boolean } = {}) {
  const auth = createMockAuth({ delay: 0 })
  if (signedIn) await auth.signUp({ name: 'Ana Cruz', email: 'ana@example.com', password: 'long enough' })
  const router = createMemoryRouter([{ path: '/', element: <CardOffer offer={offer} /> }], { initialEntries: [path] })
  render(
    <SessionProvider repository={auth}>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  const user = userEvent.setup()
  return { user, router }
}

describe('CardOffer', () => {
  it('orders at the discounted price, with the owner\'s name filled in', async () => {
    const { user } = await setup({ offer: { ...DEFAULT_PRICING.card, discount: 20 } })
    expect(screen.getByText('20% off')).toBeInTheDocument()
    expect(screen.getByText('₱303')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Get now/ }))
    expect(await screen.findByText('NFC card · ₱303 each')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Ana Cruz')
  })

  it('sends a visitor without an account to sign-up, to come back to the form', async () => {
    const { user, router } = await setup({ signedIn: false })
    await user.click(screen.getByRole('button', { name: /Get now/ }))
    expect(router.state.location.search).toBe('?auth=signup&next=%2F%3Forder%3Dcards')
    expect(screen.queryByText(/each$/)).not.toBeInTheDocument()
  })

  it('opens the form by itself when an owner comes back from sign-up', async () => {
    const { user, router } = await setup({ path: '/?order=cards' })
    expect(await screen.findByText('NFC card · ₱379 each')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(router.state.location.search).toBe('')
  })

  it('waits for the offer before taking orders', async () => {
    await setup({ offer: null })
    expect(screen.getByRole('button', { name: /Get now/ })).toBeDisabled()
  })
})

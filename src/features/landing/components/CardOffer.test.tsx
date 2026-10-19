import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PRICING } from '@/data/pricing'
import { CardOffer } from './CardOffer'

describe('CardOffer', () => {
  it('orders at the discounted price', async () => {
    const user = userEvent.setup()
    render(<CardOffer offer={{ ...DEFAULT_PRICING.card, discount: 20 }} />)
    expect(screen.getByText('20% off')).toBeInTheDocument()
    expect(screen.getByText('₱303')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Get now/ }))
    expect(await screen.findByText('NFC card · ₱303 each')).toBeInTheDocument()
  })

  it('lists what the admin included and waits for the offer before taking orders', () => {
    const { rerender } = render(<CardOffer offer={null} />)
    expect(screen.getByRole('button', { name: /Get now/ })).toBeDisabled()
    rerender(<CardOffer offer={{ ...DEFAULT_PRICING.card, perks: ['Free delivery in Cebu'] }} />)
    expect(screen.getByRole('button', { name: /Get now/ })).toBeEnabled()
    expect(screen.getByRole('listitem')).toHaveTextContent('Free delivery in Cebu')
  })
})

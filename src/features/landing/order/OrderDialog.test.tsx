import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderError, type OrderRepository } from '@/data/orders'
import { OrderDialog } from './OrderDialog'

function setup(bundleId: 'one' | 'two' | 'three' = 'one', repository?: OrderRepository) {
  const repo: OrderRepository = repository ?? {
    submit: vi.fn().mockResolvedValue({ reference: 'NM-TEST1', demo: false }),
  }
  const onClose = vi.fn()
  render(<OrderDialog bundleId={bundleId} onClose={onClose} repository={repo} />)
  return { repo, onClose, user: userEvent.setup() }
}

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Juan Dela Cruz')
  await user.type(screen.getByLabelText(/mobile number/i), '0917 123 4567')
  await user.type(screen.getByLabelText(/^province/i), 'Cebu')
  await user.type(screen.getByLabelText(/city/i), 'Cebu City')
  await user.type(screen.getByLabelText(/barangay/i), 'Lahug')
  await user.type(screen.getByLabelText(/street/i), '12 Salinas Drive')
  await user.type(screen.getByLabelText(/landmark/i), 'Blue gate beside the 7-Eleven')
}

describe('OrderDialog', () => {
  it('opens as a modal with the bundle name and price', () => {
    setup('two')
    expect(screen.getByRole('dialog', { name: /get your nfc card/i })).toBeInTheDocument()
    expect(screen.getByText('Any 2 cards · ₱780')).toBeInTheDocument()
  })

  it('shows what is missing and sends nothing for an empty form', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/fix the highlighted fields/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true')
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('submits a complete order with the phone number normalized', async () => {
    const { repo, user } = setup('one')
    await user.click(screen.getByLabelText(/google review/i))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledTimes(1)
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleId: 'one',
        platforms: ['google'],
        phone: '+639171234567',
        province: 'Cebu',
        consent: true,
      }),
    )
  })

  it('needs exactly two cards for the two-card bundle', async () => {
    const { repo, user } = setup('two')
    await user.click(screen.getByLabelText(/facebook/i))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/choose exactly the number of cards/i)).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('does not ask for a choice in the three-card bundle', () => {
    setup('three')
    expect(screen.getByText(/your 3 cards/i)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /facebook/i })).not.toBeInTheDocument()
  })

  it('tells the customer when the server cannot be reached', async () => {
    const repo: OrderRepository = { submit: vi.fn().mockRejectedValue(new OrderError('network')) }
    const { user } = setup('three', repo)
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled()
  })

  it('silently ignores a filled trap field', async () => {
    const { repo, user } = setup('three')
    await fillDetails(user)
    await user.type(document.querySelector<HTMLInputElement>('input[name="website"]')!, 'http://spam.example')
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(repo.submit).not.toHaveBeenCalled()
  })
})

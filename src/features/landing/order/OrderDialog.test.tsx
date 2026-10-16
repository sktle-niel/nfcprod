import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderError, type OrderRepository } from '@/data/orders'
import { OrderDialog } from './OrderDialog'

function setup(repository?: OrderRepository) {
  const repo: OrderRepository = repository ?? {
    submit: vi.fn().mockResolvedValue({ reference: 'NM-TEST1', demo: false }),
  }
  const onClose = vi.fn()
  render(<OrderDialog bundleId="one" onClose={onClose} repository={repo} />)
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
  it('opens as a modal with the card name and price', () => {
    setup()
    expect(screen.getByRole('dialog', { name: /get your nfc card/i })).toBeInTheDocument()
    expect(screen.getByText('1 NFC card · ₱499')).toBeInTheDocument()
  })

  it('shows what is missing and sends nothing for an empty form', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/fix the highlighted fields/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true')
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('submits a complete order with the phone number normalized', async () => {
    const { repo, user } = setup()
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

  it('offers the three cards as one choice', () => {
    setup()
    expect(screen.getByRole('group', { name: /choose 1 card/i })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('needs a card before sending', async () => {
    const { repo, user } = setup()
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/choose your card/i)).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('tells the customer when the server cannot be reached', async () => {
    const repo: OrderRepository = { submit: vi.fn().mockRejectedValue(new OrderError('network')) }
    const { user } = setup(repo)
    await user.click(screen.getByLabelText(/facebook/i))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled()
  })

  it('silently ignores a filled trap field', async () => {
    const { repo, user } = setup()
    await fillDetails(user)
    await user.type(document.querySelector<HTMLInputElement>('input[name="website"]')!, 'http://spam.example')
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(repo.submit).not.toHaveBeenCalled()
  })
})

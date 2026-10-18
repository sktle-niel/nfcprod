import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LocationRepository } from '@/data/locations'
import { OrderError, type OrderRepository } from '@/data/orders'
import { fakeLocations } from '@/test/locations'
import { OrderDialog } from './OrderDialog'

function setup(repository?: OrderRepository) {
  const repo: OrderRepository = repository ?? {
    submit: vi.fn().mockResolvedValue({ reference: 'NM-TEST1', demo: false }),
  }
  const onClose = vi.fn()
  render(<OrderDialog onClose={onClose} repository={repo} />)
  return { repo, onClose, user: userEvent.setup() }
}

type User = ReturnType<typeof userEvent.setup>

/** Waits until the list has the option, then picks it. */
async function choose(user: User, label: RegExp, option: string) {
  await screen.findByRole('option', { name: option })
  await user.selectOptions(screen.getByLabelText(label), option)
}

async function fillContact(user: User) {
  await user.type(screen.getByLabelText(/full name/i), 'Juan Dela Cruz')
  await user.type(screen.getByLabelText(/mobile number/i), '0917 123 4567')
}

async function fillAddress(user: User) {
  await user.type(screen.getByLabelText(/street/i), '12 Salinas Drive')
  await user.type(screen.getByLabelText(/landmark/i), 'Blue gate beside the 7-Eleven')
}

async function fillDetails(user: User) {
  await fillContact(user)
  await choose(user, /^province/i, 'Cebu')
  await choose(user, /^city/i, 'Cebu City')
  await choose(user, /^barangay/i, 'Lahug')
  await fillAddress(user)
}

describe('OrderDialog', () => {
  it('opens as a modal with the card name and price', () => {
    setup()
    expect(screen.getByRole('dialog', { name: /get your nfc card/i })).toBeInTheDocument()
    expect(screen.getByText('NFC card · ₱499 each')).toBeInTheDocument()
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
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledTimes(1)
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ platform: 'google', quantity: 1 }],
        phone: '+639171234567',
        province: 'Cebu',
        city: 'Cebu City',
        barangay: 'Lahug',
        consent: true,
      }),
    )
  })

  it('closes with Done once the order is in', async () => {
    const { onClose, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    await user.click(await screen.findByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('adds a quantity for every chosen card and keeps the total in view', async () => {
    const { user } = setup()
    expect(screen.getByRole('status')).toHaveTextContent('Total · 0 cards₱0')
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.click(screen.getByRole('checkbox', { name: /instagram/i }))
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    expect(screen.getAllByRole('textbox', { name: /quantity/i })).toHaveLength(3)
    expect(screen.getByRole('status')).toHaveTextContent('Total · 3 cards₱1,497')

    await user.click(screen.getByRole('button', { name: /more facebook cards/i }))
    expect(screen.getByRole('textbox', { name: /facebook quantity/i })).toHaveValue('2')
    expect(screen.getByText('₱998')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Total · 4 cards₱1,996')

    await user.click(screen.getByRole('checkbox', { name: /instagram/i }))
    expect(screen.getAllByRole('textbox', { name: /quantity/i })).toHaveLength(2)
  })

  it('sets every chosen card at once', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await user.click(screen.getByRole('button', { name: 'Set all to 5' }))
    expect(screen.getByRole('textbox', { name: /facebook quantity/i })).toHaveValue('5')
    expect(screen.getByRole('textbox', { name: /google review quantity/i })).toHaveValue('5')
    expect(screen.getByRole('status')).toHaveTextContent('Total · 10 cards₱4,990')
  })

  it('replaces the number when the customer types over it', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    const field = screen.getByRole('textbox', { name: /facebook quantity/i })
    await user.click(field)
    await user.keyboard('7')
    expect(field).toHaveValue('7')
  })

  it('sends the quantity of each card', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    const google = screen.getByRole('textbox', { name: /google review quantity/i })
    await user.clear(google)
    await user.type(google, '5')
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { platform: 'facebook', quantity: 1 },
          { platform: 'google', quantity: 5 },
        ],
      }),
    )
  })

  it('needs a card before sending', async () => {
    const { repo, user } = setup()
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/choose at least one card/i)).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('asks for a quantity from 1 to 20', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.clear(screen.getByRole('textbox', { name: /facebook quantity/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/from 1 to 20/i)).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('tells the customer when the server cannot be reached', async () => {
    const repo: OrderRepository = { submit: vi.fn().mockRejectedValue(new OrderError('network')) }
    const { user } = setup(repo)
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMockPricing, DEFAULT_PRICES, type PricingRepository } from '@/data/pricing'
import { PricingPage } from './PricingPage'

async function renderPage(repository: PricingRepository = createMockPricing()) {
  render(<PricingPage repository={repository} />)
  return screen.findByRole('textbox', { name: 'NFC card' })
}

describe('PricingPage', () => {
  it('shows the saved prices in whole pesos, with what a year saves', async () => {
    expect(await renderPage()).toHaveValue('379')
    expect(screen.getByRole('textbox', { name: 'NFC + Website, monthly' })).toHaveValue('479')
    expect(screen.getByRole('textbox', { name: 'NFC + Website, annual' })).toHaveValue('3999')
    expect(screen.getByText('About ₱333 a month. Saves 30% (₱1,749) against 12 months.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save prices' })).toBeDisabled()
  })

  it('saves a new card price', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    const card = await renderPage(repository)
    await user.clear(card)
    await user.type(card, '299')
    await user.click(screen.getByRole('button', { name: 'Save prices' }))
    expect(await screen.findByText('Saved. The landing page shows these prices now.')).toBeInTheDocument()
    expect(await repository.get()).toEqual({ ...DEFAULT_PRICES, card: 29900 })
  })

  it('keeps a bad price from being saved and says why', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    await renderPage(repository)
    const year = screen.getByRole('textbox', { name: 'NFC + Website, annual' })
    await user.clear(year)
    await user.type(year, '9000')
    expect(screen.getByText('No saving against 12 months, so the landing page shows no Save mark.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save prices' }))
    expect(screen.getByText('A year cannot cost more than 12 months.')).toBeInTheDocument()
    expect(year).toHaveFocus()
    expect(await repository.get()).toEqual(DEFAULT_PRICES)
  })

  it('undoes the changes', async () => {
    const user = userEvent.setup()
    const card = await renderPage()
    await user.type(card, '0')
    expect(card).toHaveValue('3790')
    await user.click(screen.getByRole('button', { name: 'Undo changes' }))
    expect(card).toHaveValue('379')
  })

  it('says so when saving fails', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    const failing: PricingRepository = { get: () => repository.get(), save: () => Promise.reject(new Error('offline')) }
    const card = await renderPage(failing)
    await user.type(card, '0')
    await user.click(screen.getByRole('button', { name: 'Save prices' }))
    expect(await screen.findByText('Could not save the prices. Try again.')).toBeInTheDocument()
  })
})

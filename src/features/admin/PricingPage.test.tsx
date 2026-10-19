import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMockPricing, DEFAULT_PRICING, type PricingRepository } from '@/data/pricing'
import { PricingPage } from './PricingPage'

async function renderPage(repository: PricingRepository = createMockPricing()) {
  render(<PricingPage repository={repository} />)
  await screen.findByRole('heading', { name: 'NFC card' })
}

const tab = (name: string | RegExp) => screen.getByRole('button', { name })
const field = (name: string) => screen.getByRole('textbox', { name })
const save = () => screen.getByRole('button', { name: 'Save changes' })

describe('PricingPage', () => {
  it('opens on the NFC card with its price, discount and included items', async () => {
    await renderPage()
    expect(tab('NFC card')).toHaveAttribute('aria-pressed', 'true')
    expect(field('Regular price')).toHaveValue('379')
    expect(field('Discount')).toHaveValue('0')
    expect(field('Included item 1')).toHaveValue(DEFAULT_PRICING.card.perks[0])
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('shows one offer at a time and keeps edits when switching tabs', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.type(field('Regular price'), '0')
    await user.click(tab('Annual'))
    expect(screen.getByRole('heading', { name: 'NFC + Website, annual' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'NFC card' })).not.toBeInTheDocument()
    expect(screen.getByText(/about ₱333 a month, 30% \(₱1,749\) less than 12 months/)).toBeInTheDocument()
    await user.click(tab('NFC card'))
    expect(field('Regular price')).toHaveValue('3790')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('applies a discount and shows what customers pay', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    await renderPage(repository)
    await user.clear(field('Discount'))
    await user.type(field('Discount'), '20')
    expect(screen.getByText('Customers pay ₱303, 20% off ₱379.')).toBeInTheDocument()
    await user.click(save())
    expect(await screen.findByText('Saved. The landing page shows these now.')).toBeInTheDocument()
    expect((await repository.get()).card).toEqual({ ...DEFAULT_PRICING.card, discount: 20 })
  })

  it('adds, edits and removes included items', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    await renderPage(repository)
    await user.click(tab('Monthly'))
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(field(`Included item ${DEFAULT_PRICING.month.perks.length + 1}`), 'Priority support')
    await user.click(screen.getByRole('button', { name: 'Remove item 1' }))
    await user.click(save())
    await screen.findByText('Saved. The landing page shows these now.')
    expect((await repository.get()).month.perks).toEqual([...DEFAULT_PRICING.month.perks.slice(1), 'Priority support'])
  })

  it('marks the tabs with problems and opens the first one at the problem', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    await renderPage(repository)
    await user.click(tab('Annual'))
    await user.clear(field('Regular price'))
    await user.type(field('Regular price'), '9000')
    await user.click(tab('NFC card'))
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.click(tab('Monthly'))
    await user.click(save())

    expect(tab('NFC card, has errors')).toHaveAttribute('aria-pressed', 'true')
    expect(tab('Annual, has errors')).toBeInTheDocument()
    expect(tab('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Write the item, or remove it.')).toBeInTheDocument()
    expect(field(`Included item ${DEFAULT_PRICING.card.perks.length + 1}`)).toHaveFocus()

    await user.click(tab(/Annual/))
    expect(screen.getByText('A year cannot cost more than 12 monthly payments.')).toBeInTheDocument()
    expect(await repository.get()).toEqual(DEFAULT_PRICING)
  })

  it('undoes the changes', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.type(field('Regular price'), '0')
    await user.click(screen.getByRole('button', { name: 'Undo changes' }))
    expect(field('Regular price')).toHaveValue('379')
  })

  it('says so when saving fails', async () => {
    const user = userEvent.setup()
    const repository = createMockPricing()
    const failing: PricingRepository = { get: () => repository.get(), save: () => Promise.reject(new Error('offline')) }
    await renderPage(failing)
    await user.type(field('Regular price'), '0')
    await user.click(save())
    expect(await screen.findByText('Could not save the prices. Try again.')).toBeInTheDocument()
  })
})

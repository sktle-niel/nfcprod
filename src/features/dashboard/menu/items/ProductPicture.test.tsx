import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { OwnerRepository } from '@/data/ownerRepository'
import { fill } from '@/shared/lib/fill'
import { renderDashboardPage } from '@/test/dashboard'
import { ItemsTab } from './ItemsTab'

/*
 * The owner's pages draw a picture only where the public pages would: an address the rules do not allow (an old row, a
 * changed storage address) is never requested by the owner's browser. The mock cannot store such an address, so the
 * repository is made to answer with one.
 */

const { items, productEditor } = dashboardCopy
const TRUSTED = 'https://images.example.com/cold-brew.png'
const OTHER_HOST = 'https://tracker.example.net/cold-brew.png'

const withPicture = (address: string) => (real: OwnerRepository): OwnerRepository => ({
  ...real,
  getMenu: async () => {
    const menu = await real.getMenu()
    return { ...menu, products: menu.products.map((product) => (product.name === 'Cold Brew' ? { ...product, image: address } : product)) }
  },
})

const pictures = () => Array.from(document.querySelectorAll('img')).map((image) => image.getAttribute('src'))

describe('Pictures on the Items tab', () => {
  it('draws the picture of an item from the storage address', async () => {
    await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: withPicture(TRUSTED) })
    await waitFor(() => expect(pictures()).toContain(TRUSTED))
  })

  it('draws no picture from any other host, in the list or in the editor', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: withPicture(OTHER_HOST) })
    await screen.findByText('Cold Brew')
    expect(pictures()).not.toContain(OTHER_HOST)

    await user.click(screen.getByRole('button', { name: fill(items.product.editLabel, { name: 'Cold Brew' }) }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    expect(dialog.getByRole('button', { name: productEditor.photo.choose })).toBeInTheDocument()
    expect(pictures()).not.toContain(OTHER_HOST)
  })
})

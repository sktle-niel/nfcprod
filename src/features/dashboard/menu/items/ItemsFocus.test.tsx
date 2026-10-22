import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardPage } from '@/test/dashboard'
import { ItemsTab } from './ItemsTab'
import type { ProductEditorProps } from './ProductEditor'

// The real editor has its own tests: here a stand-in saves, so the tab's words for a save can be read.
vi.mock('./ProductEditor', () => ({
  ProductEditor: ({ product, onSaved, onClose }: ProductEditorProps) => (
    <div role="dialog" aria-label="Editor stand-in">
      <button
        type="button"
        onClick={() => {
          onSaved?.({ name: 'Mocha', added: product === null })
          onClose()
        }}
      >
        Save editor
      </button>
      <button type="button" onClick={onClose}>
        Close editor
      </button>
    </div>
  ),
}))

const text = dashboardCopy.items
const open = (seed?: (owner: OwnerRepository) => Promise<void>) =>
  renderDashboardPage(<ItemsTab />, '/dashboard/menu', seed ? { seed } : {})
const headings = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
/** The tab's own status line (the first of the two: the toolbar's result count is the other). */
const said = () => screen.getAllByRole('status')[0] as HTMLElement

/** A third item in Hot, so an item can land in the middle of its category. */
async function addMocha(owner: OwnerRepository) {
  const menu = await owner.getMenu()
  const hot = menu.categories.find((category) => category.name === 'Hot')
  if (!hot) throw new Error('No Hot category')
  await owner.saveProduct({ categoryId: hot.id, name: 'Mocha', description: '', price: 13000, variants: [], tags: [], available: true, image: null, groupIds: [] })
}

describe('moving an item to the middle of three', () => {
  it('keeps the focus on the arrow that was pressed, then moves it to the twin at the end', async () => {
    const { user, owner } = await open(addMocha)
    await user.click(screen.getByRole('button', { name: 'Move Americano down' }))

    await waitFor(async () => expect((await owner.getMenu()).products.slice(0, 3).map((p) => p.name)).toEqual(['Spanish Latte', 'Americano', 'Mocha']))
    expect(await screen.findByText('Americano moved to 2 of 3')).toBeInTheDocument()
    // Americano sits in the middle: both arrows work, and the one that was pressed has the focus again.
    expect(screen.getByRole('button', { name: 'Move Americano up' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Move Americano down' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(await screen.findByText('Americano moved to 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Americano down' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Americano up' })).toHaveFocus()
  })

  it('says the new place each time, so a second move on the same row does not read the same', async () => {
    const { user } = await open(addMocha)
    await user.click(screen.getByRole('button', { name: 'Move Americano down' }))
    await screen.findByText('Americano moved to 2 of 3')
    const first = said().textContent
    await user.keyboard('{Enter}')
    await screen.findByText('Americano moved to 3 of 3')
    expect(said().textContent).not.toBe(first)
  })
})

describe('moving a category to the middle of three', () => {
  const blended = async (owner: OwnerRepository) => {
    await owner.saveCategory({ name: 'Blended', visible: true })
  }

  it('keeps the focus on the arrow that was pressed, then moves it to the twin at the end', async () => {
    const { user, owner } = await open(blended)
    await user.click(screen.getByRole('button', { name: 'Move Hot down' }))

    expect(await screen.findByText('Hot moved to 2 of 3')).toBeInTheDocument()
    expect(headings()).toEqual(['Iced', 'Hot', 'Blended'])
    expect((await owner.getMenu()).categories.map((c) => c.name)).toEqual(['Iced', 'Hot', 'Blended'])
    expect(screen.getByRole('button', { name: 'Move Hot down' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(await screen.findByText('Hot moved to 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Hot up' })).toHaveFocus()
  })
})

describe('the search box', () => {
  it('gets the focus back when Clear search takes itself away', async () => {
    const { user } = await open()
    await user.type(screen.getByRole('searchbox'), 'pizza')
    await user.click(screen.getByRole('button', { name: text.toolbar.clearSearch }))
    expect(screen.queryByRole('button', { name: text.toolbar.clearSearch })).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('gets the focus when the only item a search found is deleted', async () => {
    const { user } = await open()
    await user.type(screen.getByRole('searchbox'), 'cold brew')
    await user.click(screen.getByRole('button', { name: 'Delete Cold Brew' }))
    await user.click(screen.getByRole('button', { name: text.product.confirmDelete }))

    expect(await screen.findByText('Deleted Cold Brew')).toBeInTheDocument()
    expect(screen.getByText('No items match "cold brew".')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('keeps the count of results in the page when it is empty, so its first words are read', async () => {
    await open()
    const regions = screen.getAllByRole('status')
    expect(regions).toHaveLength(2)
    expect(regions.every((region) => region.textContent === '')).toBe(true)
  })
})

describe('what the editor tells the tab', () => {
  it('announces an added item and gives the focus back to Add item', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Add item to Hot' }))
    await user.click(screen.getByRole('button', { name: 'Save editor' }))

    await waitFor(() => expect(within(said()).getByText('Added Mocha')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Add item to Hot' })).toHaveFocus()
  })

  it('announces a changed item, and says nothing when the editor is only closed', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Edit Cold Brew' }))
    await user.click(screen.getByRole('button', { name: 'Save editor' }))
    await waitFor(() => expect(said()).toHaveTextContent('Saved Mocha'))
    expect(screen.getByRole('button', { name: 'Edit Cold Brew' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Edit Cold Brew' }))
    await user.click(screen.getByRole('button', { name: 'Close editor' }))
    await waitFor(() => expect(said()).toHaveTextContent(/^$/))
  })

  it('reads the same words again when the same thing happens twice', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Edit Cold Brew' }))
    await user.click(screen.getByRole('button', { name: 'Save editor' }))
    await waitFor(() => expect(said()).toHaveTextContent('Saved Mocha'))
    const first = within(said()).getByText('Saved Mocha')

    await user.click(screen.getByRole('button', { name: 'Edit Cold Brew' }))
    await user.click(screen.getByRole('button', { name: 'Save editor' }))
    await waitFor(() => expect(within(said()).getByText('Saved Mocha')).not.toBe(first))
  })
})

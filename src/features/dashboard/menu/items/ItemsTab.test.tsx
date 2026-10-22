import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardPage } from '@/test/dashboard'
import { ItemsTab } from './ItemsTab'
import type { ProductEditorProps } from './ProductEditor'

// The real editor is another file with its own tests: here a stand-in shows what the tab hands it.
vi.mock('./ProductEditor', () => ({
  ProductEditor: ({ product, categoryId, onClose }: ProductEditorProps) => (
    <div role="dialog" aria-label="Editor stand-in">
      <p>Product: {product?.name ?? 'none'}</p>
      <p>Category: {categoryId ?? 'none'}</p>
      <button type="button" onClick={onClose}>
        Close editor
      </button>
    </div>
  ),
}))

const text = dashboardCopy.items
const failing =
  (name: keyof OwnerRepository) =>
  (real: OwnerRepository): OwnerRepository => ({
    ...real,
    [name]: async () => {
      throw new OwnerError('network')
    },
  })

const open = () => renderDashboardPage(<ItemsTab />, '/dashboard/menu')
const names = (headingLevel: number) =>
  screen.getAllByRole('heading', { level: headingLevel }).map((heading) => heading.textContent)

describe('ItemsTab lists the menu', () => {
  it('shows each category as an h2 with its items, prices, sizes and tags', async () => {
    await open()
    expect(names(2)).toEqual(['Hot', 'Iced'])
    expect(screen.getByText('from ₱120 · 3 sizes')).toBeInTheDocument()
    expect(screen.getByText('from ₱165 · 3 sizes')).toBeInTheDocument()
    expect(screen.getByText('₱150')).toBeInTheDocument()
    expect(screen.getByText('Best seller')).toBeInTheDocument()
    expect(screen.getByText('Vegan')).toBeInTheDocument()
  })

  it('counts the items and marks the sold out one', async () => {
    await open()
    expect(screen.getByText('4 items')).toBeInTheDocument()
    expect(screen.getByText(text.product.soldOut)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Available: Iced Caramel Macchiato' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Available: Cold Brew' })).toHaveAttribute('aria-checked', 'true')
  })

  it('says so when a category has no items', async () => {
    await renderDashboardPage(<ItemsTab />, '/dashboard/menu', {
      menu: 'preset',
    })
    expect(screen.getAllByText(text.category.noItems).length).toBeGreaterThan(0)
    expect(screen.getByText('0 items')).toBeInTheDocument()
  })
})

describe('ItemsTab search', () => {
  it('keeps only the items that match and the categories that hold them', async () => {
    const { user } = await open()
    await user.type(screen.getByRole('searchbox', { name: text.toolbar.searchLabel }), 'cold')
    expect(names(2)).toEqual(['Iced'])
    expect(screen.getByText('Cold Brew')).toBeInTheDocument()
    expect(screen.queryByText('Americano')).not.toBeInTheDocument()
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('ignores case and spaces around the words', async () => {
    const { user } = await open()
    await user.type(screen.getByRole('searchbox'), '  SPANISH ')
    expect(screen.getByText('Spanish Latte')).toBeInTheDocument()
    expect(screen.queryByText('Cold Brew')).not.toBeInTheDocument()
  })

  it('says nothing matched, and the clear button brings everything back', async () => {
    const { user } = await open()
    await user.type(screen.getByRole('searchbox'), 'pizza')
    expect(screen.getByText('No items match "pizza".')).toBeInTheDocument()
    expect(screen.getByText('0 results')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: text.toolbar.clearSearch }))
    expect(names(2)).toEqual(['Hot', 'Iced'])
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('hides the move arrows while searching, because the list is partial', async () => {
    const { user } = await open()
    expect(screen.getByRole('button', { name: 'Move Cold Brew up' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'cold')
    expect(screen.queryByRole('button', { name: 'Move Cold Brew up' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move Iced up' })).not.toBeInTheDocument()
  })
})

describe('ItemsTab availability', () => {
  it('flips an item to sold out and back, saves it, and announces it', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('switch', { name: 'Available: Cold Brew' }))
    await waitFor(async () => expect((await owner.getMenu()).products.find((p) => p.name === 'Cold Brew')?.available).toBe(false))
    expect(await screen.findByText('Cold Brew is marked sold out')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Available: Cold Brew' })).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByRole('switch', { name: 'Available: Iced Caramel Macchiato' }))
    expect(await screen.findByText('Iced Caramel Macchiato is available')).toBeInTheDocument()
  })

  it('shows a failure in words and leaves the item as it was', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: failing('setAvailable') })
    await user.click(screen.getByRole('switch', { name: 'Available: Cold Brew' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(dashboardCopy.shell.errors.network)
    expect(screen.getByRole('switch', { name: 'Available: Cold Brew' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('ItemsTab moves items', () => {
  it('turns the arrows off at the ends of a category', async () => {
    await open()
    expect(screen.getByRole('button', { name: 'Move Americano up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Americano down' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Move Spanish Latte down' })).toBeDisabled()
  })

  it('moves an item down, saves the order, and keeps the focus on a working arrow', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Move Americano down' }))
    expect(await screen.findByText('Americano moved to 2 of 2')).toBeInTheDocument()

    const order = (await owner.getMenu()).products.map((p) => p.name)
    expect(order.indexOf('Spanish Latte')).toBeLessThan(order.indexOf('Americano'))
    // It is last now, so "down" is off and the focus goes to "up".
    expect(screen.getByRole('button', { name: 'Move Americano down' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Americano up' })).toHaveFocus()
  })

  it('shows a failed move in words', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: failing('moveProduct') })
    await user.click(screen.getByRole('button', { name: 'Move Americano down' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(dashboardCopy.shell.errors.network)
  })
})

describe('ItemsTab deletes items', () => {
  it('asks first, and Keep it changes nothing', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Delete Cold Brew' }))
    expect(screen.getByRole('dialog', { name: 'Delete Cold Brew?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: text.dialog.cancel }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await owner.getMenu()).products).toHaveLength(4)
  })

  it('deletes, announces, and moves the focus to the neighbour', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Delete Americano' }))
    await user.click(screen.getByRole('button', { name: text.product.confirmDelete }))

    expect(await screen.findByText('Deleted Americano')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await owner.getMenu()).products.map((p) => p.name)).not.toContain('Americano')
    expect(screen.getByRole('button', { name: 'Edit Spanish Latte' })).toHaveFocus()
  })

  it('sends the focus to Add item when the last item of a category goes', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Delete Americano' }))
    await user.click(screen.getByRole('button', { name: text.product.confirmDelete }))
    await screen.findByText('Deleted Americano')
    await user.click(screen.getByRole('button', { name: 'Delete Spanish Latte' }))
    await user.click(screen.getByRole('button', { name: text.product.confirmDelete }))
    await screen.findByText('Deleted Spanish Latte')
    expect(screen.getByRole('button', { name: 'Add item to Hot' })).toHaveFocus()
  })

  it('keeps the question open and says why when the delete fails', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: failing('deleteProduct') })
    await user.click(screen.getByRole('button', { name: 'Delete Cold Brew' }))
    await user.click(screen.getByRole('button', { name: text.product.confirmDelete }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(dashboardCopy.shell.errors.network)
    expect(screen.getByText('Cold Brew')).toBeInTheDocument()
  })
})

describe('ItemsTab opens the editor', () => {
  it('hands the item to the editor from Edit, and gives the focus back on close', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Edit Cold Brew' }))
    expect(screen.getByText('Product: Cold Brew')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close editor' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Cold Brew' })).toHaveFocus()
  })

  it('opens the editor for a new item in the category whose Add item was used', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Add item to Iced' }))
    const iced = (await owner.getMenu()).categories.find((category) => category.name === 'Iced')
    expect(screen.getByText('Product: none')).toBeInTheDocument()
    expect(screen.getByText(`Category: ${iced?.id}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close editor' }))
    expect(screen.getByRole('button', { name: 'Add item to Iced' })).toHaveFocus()
  })
})

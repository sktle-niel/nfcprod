import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { LIMITS } from '@/entities/menu/menu'
import { renderDashboardPage } from '@/test/dashboard'
import { ItemsTab } from './ItemsTab'

vi.mock('./ProductEditor', () => ({ ProductEditor: () => null }))

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
const headings = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('ItemsTab adds a category', () => {
  it('opens a form, saves the name, announces it, and puts the focus back on Add category', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    expect(screen.getByRole('textbox', { name: text.category.nameLabel })).toHaveFocus()

    await user.type(screen.getByRole('textbox', { name: text.category.nameLabel }), '  Pastries ')
    await user.click(screen.getByRole('button', { name: text.category.save }))

    expect(await screen.findByText('Added Pastries')).toBeInTheDocument()
    expect(headings()).toEqual(['Hot', 'Iced', 'Pastries'])
    expect((await owner.getMenu()).categories.map((c) => c.name)).toContain('Pastries')
    expect(screen.getByRole('button', { name: text.toolbar.addCategory })).toHaveFocus()
  })

  it('keeps a name with dollar patterns exactly as typed in the announcement and in every label', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    // fireEvent, because user-event reads {n} in typed text as a key.
    fireEvent.change(screen.getByRole('textbox', { name: text.category.nameLabel }), { target: { value: 'Pa$$ta {n} $&' } })
    await user.click(screen.getByRole('button', { name: text.category.save }))

    expect(await screen.findByText('Added Pa$$ta {n} $&')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.category.deleteLabel.replace('{name}', () => 'Pa$$ta {n} $&') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.category.addItemLabel.replace('{name}', () => 'Pa$$ta {n} $&') })).toBeInTheDocument()
  })

  it('refuses an empty name and a name already in use, next to the field', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(screen.getByText(text.category.errors.name.required)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: text.category.nameLabel }), 'hot')
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(screen.getByText(text.category.errors.name.duplicate)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: text.category.nameLabel })).toHaveAttribute('aria-invalid', 'true')
  })

  it('says a name is too long, with the limit', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    fireEvent.change(screen.getByRole('textbox', { name: text.category.nameLabel }), { target: { value: 'x'.repeat(LIMITS.categoryName + 1) } })
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(screen.getByText(text.category.errors.name.tooLong.replace('{max}', String(LIMITS.categoryName)))).toBeInTheDocument()
  })

  it('says the menu has too many categories, with the limit', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', {
      seed: async (owner) => {
        for (let index = 0; index < LIMITS.categories - 2; index += 1) await owner.saveCategory({ name: `Extra ${index}`, visible: true })
      },
    })
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: text.category.nameLabel }), 'One more')
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(await screen.findByText(text.category.errors.name.tooMany.replace('{max}', String(LIMITS.categories)))).toBeInTheDocument()
  })

  it('closes with Escape or Cancel without saving', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: text.category.nameLabel }), 'Nope')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: text.category.nameLabel })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.toolbar.addCategory })).toHaveFocus()
    expect((await owner.getMenu()).categories).toHaveLength(2)
  })

  it('says in words when the save fails', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: failing('saveCategory') })
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: text.category.nameLabel }), 'Pastries')
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(await screen.findByRole('alert')).toHaveTextContent(dashboardCopy.shell.errors.network)
  })
})

describe('ItemsTab changes a category', () => {
  it('renames it in place and returns the focus to Rename', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Rename Hot' }))
    const input = screen.getByRole('textbox', {
      name: text.category.nameLabel,
    })
    expect(input).toHaveValue('Hot')

    await user.clear(input)
    await user.type(input, 'Hot drinks')
    await user.click(screen.getByRole('button', { name: text.category.save }))

    expect(await screen.findByText('Saved Hot drinks')).toBeInTheDocument()
    expect(headings()).toEqual(['Hot drinks', 'Iced'])
    expect((await owner.getMenu()).categories[0]?.name).toBe('Hot drinks')
    expect(screen.getByRole('button', { name: 'Rename Hot drinks' })).toHaveFocus()
  })

  it('refuses the name of another category and keeps the form open', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Rename Hot' }))
    const input = screen.getByRole('textbox', {
      name: text.category.nameLabel,
    })
    await user.clear(input)
    await user.type(input, 'Iced')
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(screen.getByText(text.category.errors.name.duplicate)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: text.category.nameLabel })).toHaveAttribute('aria-invalid', 'true')
  })

  it('accepts its own name with another case', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Rename Hot' }))
    const input = screen.getByRole('textbox', {
      name: text.category.nameLabel,
    })
    await user.clear(input)
    await user.type(input, 'HOT')
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(await screen.findByText('Saved HOT')).toBeInTheDocument()
    expect((await owner.getMenu()).categories[0]?.name).toBe('HOT')
  })

  it('cancels a rename with Escape and returns the focus to Rename', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Rename Hot' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Hot' })).toHaveFocus()
  })

  it('hides it from the menu with the Shown switch and says so', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('switch', { name: 'Shown on the menu: Hot' }))
    expect(await screen.findByText('Hot is hidden from the menu')).toBeInTheDocument()
    expect((await owner.getMenu()).categories[0]?.visible).toBe(false)
    expect(screen.getByText(text.category.hiddenNote)).toBeInTheDocument()
  })

  it('moves it down, with the arrows off at the ends', async () => {
    const { user, owner } = await open()
    expect(screen.getByRole('button', { name: 'Move Hot up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Iced down' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Move Hot down' }))
    expect(await screen.findByText('Hot moved to 2 of 2')).toBeInTheDocument()
    expect(headings()).toEqual(['Iced', 'Hot'])
    expect((await owner.getMenu()).categories.map((c) => c.name)).toEqual(['Iced', 'Hot'])
    expect(screen.getByRole('button', { name: 'Move Hot up' })).toHaveFocus()
  })
})

describe('ItemsTab deletes a category', () => {
  it('says how many items go with it, deletes them, and moves the focus to Add category', async () => {
    const { user, owner } = await open()
    await user.click(screen.getByRole('button', { name: 'Delete category Hot' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Hot?' })
    expect(within(dialog).getByText('This also deletes its 2 items. This cannot be undone.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: text.category.confirmDelete }))
    expect(await screen.findByText('Deleted Hot')).toBeInTheDocument()
    expect(headings()).toEqual(['Iced'])
    const menu = await owner.getMenu()
    expect(menu.products.map((p) => p.name).sort()).toEqual(['Cold Brew', 'Iced Caramel Macchiato'])
    expect(screen.getByRole('button', { name: text.toolbar.addCategory })).toHaveFocus()
  })

  it('uses the singular for one item and a plain sentence for none', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', {
      seed: async (owner) => {
        const menu = await owner.getMenu()
        const hot = menu.categories.find((category) => category.name === 'Hot')
        const americano = menu.products.find((product) => product.name === 'Americano')
        if (hot && americano) await owner.deleteProduct(americano.id)
        await owner.saveCategory({ name: 'Empty', visible: true })
      },
    })
    await user.click(screen.getByRole('button', { name: 'Delete category Hot' }))
    expect(screen.getByText('This also deletes its only item. This cannot be undone.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: text.dialog.cancel }))

    await user.click(screen.getByRole('button', { name: 'Delete category Empty' }))
    expect(screen.getByText(text.category.deleteEmpty)).toBeInTheDocument()
  })

  it('keeps the dialog and says why when the delete fails', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: failing('deleteCategory') })
    await user.click(screen.getByRole('button', { name: 'Delete category Hot' }))
    await user.click(screen.getByRole('button', { name: text.category.confirmDelete }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(dashboardCopy.shell.errors.network)
    expect(headings()).toContain('Hot')
  })
})

describe('ItemsTab without categories', () => {
  const empty = {
    seed: async (owner: OwnerRepository) => {
      for (const category of (await owner.getMenu()).categories) await owner.deleteCategory(category.id)
    },
  }

  it('explains what to do and offers the categories of the business type', async () => {
    await renderDashboardPage(<ItemsTab />, '/dashboard/menu', empty)
    expect(screen.getByRole('heading', { level: 2, name: text.empty.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.toolbar.addCategory })).toBeInTheDocument()
    for (const name of ['Hot', 'Iced', 'Blended', 'Pastries']) {
      expect(screen.getByRole('button', { name: `Add ${name}` })).toBeInTheDocument()
    }
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('adds a suggested category in one click and then shows the list', async () => {
    const { user, owner } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', empty)
    await user.click(screen.getByRole('button', { name: 'Add Pastries' }))

    expect(await screen.findByText('Added Pastries')).toBeInTheDocument()
    expect(headings()).toEqual(['Pastries'])
    expect((await owner.getMenu()).categories.map((c) => c.name)).toEqual(['Pastries'])
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('opens the same form as the toolbar for a category of its own', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', empty)
    await user.click(screen.getByRole('button', { name: text.toolbar.addCategory }))
    expect(screen.getByRole('textbox', { name: text.category.nameLabel })).toHaveFocus()
    await user.type(screen.getByRole('textbox', { name: text.category.nameLabel }), 'Specials')
    await user.click(screen.getByRole('button', { name: text.category.save }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Specials' })).toBeInTheDocument()
  })

  it('says in words when a suggestion cannot be saved', async () => {
    const { user } = await renderDashboardPage(<ItemsTab />, '/dashboard/menu', { ...empty, wrapOwner: failing('saveCategory') })
    await user.click(screen.getByRole('button', { name: 'Add Hot' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(dashboardCopy.shell.errors.network)
  })
})

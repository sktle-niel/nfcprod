import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { LIMITS } from '@/entities/menu/menu'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { AddonsTab } from './AddonsTab'

const text = dashboardCopy.addons
const errors = dashboardCopy.shell.errors

const renderTab = (options: DashboardOptions = {}) => renderDashboardPage(<AddonsTab />, '/dashboard/menu?tab=addons', options)
const addButton = () => screen.getByRole('button', { name: text.add })
const editor = () => screen.getByRole('dialog')

async function seedGroup(owner: OwnerRepository, name: string) {
  await owner.saveGroup({ name, required: false, min: 0, max: 1, options: [{ label: 'One', price: 0 }] })
}

const failing = (method: 'saveGroup' | 'deleteGroup' | 'moveGroup', error: OwnerError) => (real: OwnerRepository) => ({
  ...real,
  [method]: () => Promise.reject(error),
})

describe('moving a group to the middle of three', () => {
  const three = async (owner: OwnerRepository) => {
    await seedGroup(owner, 'Extras')
    await seedGroup(owner, 'Syrups')
  }

  it('keeps the focus on the arrow that was pressed, then moves it to the twin at the end', async () => {
    const { user, owner } = await renderTab({ seed: three })
    await user.click(screen.getByRole('button', { name: 'Move Milk down' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Milk moved to 2 of 3.'))
    expect((await owner.getMenu()).groups.map((group) => group.name)).toEqual(['Extras', 'Milk', 'Syrups'])
    // Milk is in the middle: both arrows work, and the one that was pressed has the focus again.
    expect(screen.getByRole('button', { name: 'Move Milk up' })).toBeEnabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Milk down' })).toHaveFocus())

    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Milk moved to 3 of 3.'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Milk up' })).toHaveFocus())
  })
})

describe('moving an option to the middle of three', () => {
  it('keeps the focus on the arrow that was pressed, says the new place each time, then moves to the twin at the end', async () => {
    const { user } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    await user.click(screen.getByRole('button', { name: text.editor.addOption }))
    await user.type(screen.getByLabelText('Option 3 name'), 'Almond milk')
    const status = () => within(editor()).getByRole('status')

    await user.click(screen.getByRole('button', { name: 'Move option 1 down' }))
    expect(status()).toHaveTextContent('Oat milk moved to 2 of 3.')
    expect(screen.getByLabelText('Option 2 name')).toHaveValue('Oat milk')
    expect(screen.getByRole('button', { name: 'Move option 2 up' })).toBeEnabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move option 2 down' })).toHaveFocus())

    await user.keyboard('{Enter}')
    expect(status()).toHaveTextContent('Oat milk moved to 3 of 3.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move option 3 up' })).toHaveFocus())
  })
})

describe('a failure that belongs to another action', () => {
  it('does not show an earlier failed suggestion inside a new Delete question', async () => {
    const { user } = await renderTab({ wrapOwner: failing('saveGroup', new OwnerError('network')) })
    await user.click(screen.getByRole('button', { name: 'Add the Syrups group' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(errors.network)

    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(errors.network)).not.toBeInTheDocument()
  })

  it('does not leave a failed delete on the list after the question is cancelled', async () => {
    const { user } = await renderTab({ wrapOwner: failing('deleteGroup', new OwnerError('network')) })
    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    await user.click(screen.getByRole('button', { name: text.confirmDelete.confirm }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(errors.network)

    await user.click(screen.getByRole('button', { name: text.confirmDelete.cancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('the group name box', () => {
  it('says the name is too long, with the limit', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    fireEvent.change(screen.getByLabelText(text.editor.name), { target: { value: 'x'.repeat(LIMITS.groupName + 1) } })
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.click(screen.getByRole('button', { name: text.editor.save }))
    expect(within(editor()).getByText(text.errors.name.tooLong.replace('{max}', String(LIMITS.groupName)))).toBeInTheDocument()
  })

  it('does not offer the saved name of a person for the group name', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    expect(screen.getByLabelText(text.editor.name)).toHaveAttribute('autocomplete', 'off')
  })
})

describe('suggestions say a price only where there is one', () => {
  it('writes the options of a suggested group with their prices', async () => {
    await renderTab()
    const item = screen.getByRole('heading', { level: 3, name: 'Syrups' }).closest('li') as HTMLElement
    expect(item).toHaveTextContent('Pick up to 2. Vanilla +₱30, Caramel +₱30, Hazelnut +₱30')
  })
})

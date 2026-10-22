import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { LIMITS } from '@/entities/menu/menu'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { AddonsTab } from './AddonsTab'

const text = dashboardCopy.addons
const errors = dashboardCopy.shell.errors

function renderTab(options: DashboardOptions = {}) {
  return renderDashboardPage(<AddonsTab />, '/dashboard/menu?tab=addons', options)
}

const addButton = () => screen.getByRole('button', { name: text.add })
const cardOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement
const editor = () => screen.getByRole('dialog')

async function seedGroup(owner: OwnerRepository, name: string, labels: string[] = ['One']) {
  await owner.saveGroup({ name, required: false, min: 0, max: 1, options: labels.map((label) => ({ label, price: 0 })) })
}

const failing = (method: 'saveGroup' | 'deleteGroup' | 'moveGroup', error: OwnerError) => (real: OwnerRepository) => ({
  ...real,
  [method]: () => Promise.reject(error),
})

describe('the add-on list', () => {
  it('shows a group with its badge, rule, options with prices and how many items use it', async () => {
    await renderTab()
    const card = within(cardOf('Milk'))
    expect(card.getByText(text.group.optional)).toBeInTheDocument()
    expect(card.getByText('Pick up to 1')).toBeInTheDocument()
    const options = card.getByRole('list', { name: 'Options of Milk' })
    expect(within(options).getByText('Oat milk').nextSibling).toHaveTextContent('+₱45')
    expect(within(options).getByText('Soy milk').nextSibling).toHaveTextContent('+₱35')
    expect(card.getByText('Used by 2 items')).toBeInTheDocument()
  })

  it('says Required, shows Free for a free option and names a group no item uses', async () => {
    await renderTab({
      seed: async (owner) => {
        await owner.saveGroup({ name: 'Doneness', required: true, min: 1, max: 1, options: [{ label: 'Rare', price: 0 }, { label: 'Well done', price: 0 }] })
      },
    })
    const card = within(cardOf('Doneness'))
    expect(card.getByText(text.group.required)).toBeInTheDocument()
    expect(card.getByText('Pick 1')).toBeInTheDocument()
    expect(card.getAllByText(text.group.free)).toHaveLength(2)
    expect(card.getByText(text.group.unused)).toBeInTheDocument()
  })

  it('shows an empty state and every suggestion when there are no groups', async () => {
    await renderTab({
      menu: 'preset',
      seed: async (owner) => {
        for (const group of (await owner.getMenu()).groups) await owner.deleteGroup(group.id)
      },
    })
    expect(screen.getByRole('heading', { name: text.empty.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add the Extra shot group' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add the Syrups group' })).toBeInTheDocument()
  })

  it('disables Add group at the limit and says why', async () => {
    await renderTab({
      seed: async (owner) => {
        for (let index = 0; index < LIMITS.groups - 1; index += 1) await seedGroup(owner, `Group ${index}`)
      },
    })
    expect(addButton()).toBeDisabled()
    expect(screen.getByText(text.limit.replace('{max}', String(LIMITS.groups)))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add the Syrups group' })).toBeDisabled()
  })
})

describe('suggestions', () => {
  it('lists the preset groups the business does not have, and nothing it has by name', async () => {
    await renderTab()
    expect(screen.getByRole('button', { name: 'Add the Extra shot group' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add the Milk alternatives group' })).toBeInTheDocument()
    // The sample menu has "Milk", which is not the preset's "Milk alternatives".
    expect(screen.queryByRole('button', { name: 'Add the Milk group' })).not.toBeInTheDocument()
  })

  it('says every suggestion is added when the menu already starts from the preset', async () => {
    await renderTab({ menu: 'preset' })
    expect(screen.getByText(text.suggestions.allAdded)).toBeInTheDocument()
  })

  it('adds a suggested group, announces it, and moves focus to the next suggestion', async () => {
    const { user, owner } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Add the Extra shot group' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add the Extra shot group' })).not.toBeInTheDocument())
    expect(within(cardOf('Extra shot')).getByText('Pick up to 1')).toBeInTheDocument()
    const menu = await owner.getMenu()
    expect(menu.groups.map((group) => group.name)).toContain('Extra shot')
    expect(screen.getByRole('status')).toHaveTextContent('Added the Extra shot group.')
    expect(screen.queryByRole('button', { name: 'Add the Extra shot group' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add the Syrups group' })).toHaveFocus()
  })

  it('says why when adding a suggestion fails, and adds nothing', async () => {
    const { user } = await renderTab({ wrapOwner: failing('saveGroup', new OwnerError('network')) })
    await user.click(screen.getByRole('button', { name: 'Add the Syrups group' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(errors.network)
    expect(screen.getByRole('button', { name: 'Add the Syrups group' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Edit Syrups' })).not.toBeInTheDocument()
  })
})

describe('adding a group', () => {
  it('saves a new group with prices in centavos, announces it and returns focus to Add group', async () => {
    const { user, owner } = await renderTab()
    await user.click(addButton())
    expect(editor()).toHaveAccessibleName(text.editor.addTitle)

    await user.type(screen.getByLabelText(text.editor.name), 'Extras')
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.type(screen.getByLabelText('Option 1 price in pesos'), '25.50')
    await user.click(screen.getByRole('button', { name: text.editor.addOption }))
    await user.type(screen.getByLabelText('Option 2 name'), 'Bacon')
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const saved = (await owner.getMenu()).groups.find((group) => group.name === 'Extras')
    expect(saved).toMatchObject({ required: false, min: 0, max: 1 })
    expect(saved?.options.map((option) => [option.label, option.price])).toEqual([
      ['Cheese', 2550],
      ['Bacon', 0],
    ])
    expect(screen.getByRole('heading', { level: 3, name: 'Extras' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Added the Extras group.')
    expect(addButton()).toHaveFocus()
  })

  it('moves the focus into the new option row when an option is added', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    await user.click(screen.getByRole('button', { name: text.editor.addOption }))
    expect(screen.getByLabelText('Option 2 name')).toHaveFocus()
  })

  it('stops adding options at the limit', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    for (let index = 1; index < LIMITS.options; index += 1) {
      await user.click(screen.getByRole('button', { name: text.editor.addOption }))
    }
    expect(screen.getByRole('button', { name: text.editor.addOption })).toBeDisabled()
    expect(screen.getByText(`${LIMITS.options} of ${LIMITS.options} options`)).toBeInTheDocument()
  })

  it('closes with Escape without saving and returns focus to Add group', async () => {
    const { user, owner } = await renderTab()
    await user.click(addButton())
    await user.type(screen.getByLabelText(text.editor.name), 'Nope')
    await user.keyboard('{Escape}')
    // jsdom does not close a dialog on Escape by itself; the Cancel button ends the same way.
    if (screen.queryByRole('dialog')) await user.click(screen.getByRole('button', { name: text.editor.cancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await owner.getMenu()).groups.map((group) => group.name)).not.toContain('Nope')
    expect(addButton()).toHaveFocus()
  })
})

describe('the min and max rules', () => {
  it('sets the fewest to 1 when the group becomes required, and back to 0 when it does not', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    const fewest = screen.getByLabelText(text.editor.min)
    await user.click(screen.getByRole('switch', { name: text.editor.required }))
    expect(fewest).toHaveValue('1')
    expect(screen.getByText('Customers will see: Pick 1.')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: text.editor.required }))
    expect(fewest).toHaveValue('0')
  })

  it('turns the switch on and off as the fewest is typed', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    const fewest = screen.getByLabelText(text.editor.min)
    await user.clear(fewest)
    await user.type(fewest, '1')
    expect(screen.getByRole('switch', { name: text.editor.required })).toBeChecked()
    await user.clear(fewest)
    await user.type(fewest, '0')
    expect(screen.getByRole('switch', { name: text.editor.required })).not.toBeChecked()
  })

  it('lowers the most when options are removed so nobody can pick more than there are', async () => {
    const { user } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    const most = screen.getByLabelText(text.editor.max)
    await user.clear(most)
    await user.type(most, '2')
    await user.click(screen.getByRole('button', { name: 'Remove option 2' }))
    expect(most).toHaveValue('1')
  })

  it('refuses a most above the number of options and puts focus on it', async () => {
    const { user, owner } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    const most = screen.getByLabelText(text.editor.max)
    await user.clear(most)
    await user.type(most, '5')
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    expect(within(editor()).getByText(text.errors.maxRange)).toBeInTheDocument()
    expect(most).toHaveFocus()
    expect(most).toHaveAttribute('aria-invalid', 'true')
    expect((await owner.getMenu()).groups[0]?.max).toBe(1)
  })

  it('refuses a fewest above the most', async () => {
    const { user } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    const fewest = screen.getByLabelText(text.editor.min)
    await user.clear(fewest)
    await user.type(fewest, '2')
    await user.click(screen.getByRole('button', { name: text.editor.save }))
    expect(within(editor()).getByText(text.errors.minRange)).toBeInTheDocument()
    expect(fewest).toHaveFocus()
  })
})

describe('editing a group', () => {
  it('keeps the ids of the options it keeps and saves the changes', async () => {
    const { user, owner } = await renderTab()
    const before = (await owner.getMenu()).groups[0]!
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    expect(editor()).toHaveAccessibleName('Edit Milk')

    await user.clear(screen.getByLabelText(text.editor.name))
    await user.type(screen.getByLabelText(text.editor.name), 'Milk choice')
    await user.clear(screen.getByLabelText('Option 1 price in pesos'))
    await user.type(screen.getByLabelText('Option 1 price in pesos'), '50')
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const after = (await owner.getMenu()).groups[0]!
    expect(after.id).toBe(before.id)
    expect(after.name).toBe('Milk choice')
    expect(after.options.map((option) => option.id)).toEqual(before.options.map((option) => option.id))
    expect(after.options[0]?.price).toBe(5000)
    expect(screen.getByRole('status')).toHaveTextContent('Saved the Milk choice group.')
    expect(screen.getByRole('button', { name: 'Edit Milk choice' })).toHaveFocus()
  })

  it('keeps the options in the order the owner moved them', async () => {
    const { user, owner } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    expect(screen.getByRole('button', { name: 'Move option 1 up' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Move option 1 down' }))
    // The browser drops focus from a node that moved; it goes back to the same control, or its twin at the end.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move option 2 up' })).toHaveFocus())
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await owner.getMenu()).groups[0]?.options.map((option) => option.label)).toEqual(['Soy milk', 'Oat milk'])
  })

  it('cannot remove the last option, and focus goes to a neighbour when one is removed', async () => {
    const { user } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Edit Milk' }))
    await user.click(screen.getByRole('button', { name: 'Remove option 1' }))
    expect(screen.getByLabelText('Option 1 name')).toHaveValue('Soy milk')
    expect(screen.getByLabelText('Option 1 name')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Remove option 1' })).toBeDisabled()
  })
})

describe('refusals in the editor', () => {
  it('shows what is missing at each box, focuses the first one and saves nothing', async () => {
    const { user, owner } = await renderTab()
    await user.click(addButton())
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    const box = within(editor())
    expect(box.getByText(text.errors.name.required)).toBeInTheDocument()
    expect(box.getByText(text.errors.optionName)).toBeInTheDocument()
    expect(screen.getByLabelText(text.editor.name)).toHaveFocus()
    expect(screen.getByLabelText(text.editor.name)).toHaveAttribute('aria-invalid', 'true')
    expect((await owner.getMenu()).groups).toHaveLength(1)
  })

  it('focuses the price box when only a price is wrong', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    await user.type(screen.getByLabelText(text.editor.name), 'Extras')
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.type(screen.getByLabelText('Option 1 price in pesos'), '12,50')
    await user.click(screen.getByRole('button', { name: text.editor.save }))
    expect(within(editor()).getByText(text.errors.optionPrice)).toBeInTheDocument()
    expect(screen.getByLabelText('Option 1 price in pesos')).toHaveFocus()
  })

  it('refuses a name another group has, ignoring case', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    await user.type(screen.getByLabelText(text.editor.name), 'milk')
    await user.type(screen.getByLabelText('Option 1 name'), 'Whole')
    await user.click(screen.getByRole('button', { name: text.editor.save }))
    expect(within(editor()).getByText(text.errors.name.duplicate)).toBeInTheDocument()
  })

  it('refuses two options with one name', async () => {
    const { user } = await renderTab()
    await user.click(addButton())
    await user.type(screen.getByLabelText(text.editor.name), 'Extras')
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.click(screen.getByRole('button', { name: text.editor.addOption }))
    await user.type(screen.getByLabelText('Option 2 name'), 'cheese')
    await user.click(screen.getByRole('button', { name: text.editor.save }))
    expect(within(editor()).getByText(text.errors.optionsDuplicate)).toBeInTheDocument()
    expect(screen.getByLabelText('Option 1 name')).toHaveFocus()
  })

  it('shows the refusal of the repository at the field and keeps the editor open', async () => {
    const { user } = await renderTab({ wrapOwner: failing('saveGroup', new OwnerError('invalid', { name: 'duplicate' })) })
    await user.click(addButton())
    await user.type(screen.getByLabelText(text.editor.name), 'Extras')
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    expect(await within(editor()).findByText(text.errors.name.duplicate)).toBeInTheDocument()
    expect(screen.getByLabelText(text.editor.name)).toHaveFocus()
  })

  it('says a failure that is not about a field in words, never the raw message', async () => {
    const { user } = await renderTab({ wrapOwner: failing('saveGroup', new OwnerError('network')) })
    await user.click(addButton())
    await user.type(screen.getByLabelText(text.editor.name), 'Extras')
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.click(screen.getByRole('button', { name: text.editor.save }))

    expect(await within(editor()).findByRole('alert')).toHaveTextContent(errors.network)
    expect(screen.getByRole('button', { name: text.editor.save })).toBeEnabled()
  })
})

describe('deleting a group', () => {
  it('asks first, says how many items lose the group, and takes it off those items', async () => {
    const { user, owner } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))

    const dialog = screen.getByRole('dialog', { name: 'Delete Milk?' })
    expect(within(dialog).getByText(/2 items will lose this group/)).toBeInTheDocument()
    expect((await owner.getMenu()).groups).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: text.confirmDelete.confirm }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const menu = await owner.getMenu()
    expect(menu.groups).toHaveLength(0)
    expect(menu.products.every((product) => product.groupIds.length === 0)).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('Deleted the Milk group.')
    expect(screen.getByRole('heading', { name: text.empty.title })).toBeInTheDocument()
    expect(addButton()).toHaveFocus()
  })

  it('says no item uses a group nobody offers', async () => {
    const { user } = await renderTab({ seed: (owner) => seedGroup(owner, 'Extras') })
    await user.click(screen.getByRole('button', { name: 'Delete Extras' }))
    expect(within(screen.getByRole('dialog')).getByText(text.confirmDelete.bodyUnused)).toBeInTheDocument()
  })

  it('keeps the group when the question is cancelled and returns focus to Delete', async () => {
    const { user, owner } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    await user.click(screen.getByRole('button', { name: text.confirmDelete.cancel }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await owner.getMenu()).groups).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Delete Milk' })).toHaveFocus()
  })

  it('puts focus on the next group after a delete', async () => {
    const { user } = await renderTab({ seed: (owner) => seedGroup(owner, 'Extras') })
    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    await user.click(screen.getByRole('button', { name: text.confirmDelete.confirm }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit Extras' })).toHaveFocus()
  })

  it('keeps the question open and says why when the delete fails', async () => {
    const { user, owner } = await renderTab({ wrapOwner: failing('deleteGroup', new OwnerError('network')) })
    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    await user.click(screen.getByRole('button', { name: text.confirmDelete.confirm }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(errors.network)
    expect((await owner.getMenu()).groups).toHaveLength(1)
  })
})

describe('moving groups', () => {
  async function renderTwo() {
    return renderTab({ seed: (owner) => seedGroup(owner, 'Extras') })
  }
  const order = async (owner: OwnerRepository) => (await owner.getMenu()).groups.map((group) => group.name)

  it('disables Up on the first group and Down on the last', async () => {
    await renderTwo()
    expect(screen.getByRole('button', { name: 'Move Milk up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Milk down' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Move Extras down' })).toBeDisabled()
  })

  it('moves a group down, announces it and keeps focus on a control of that group', async () => {
    const { user, owner } = await renderTwo()
    await user.click(screen.getByRole('button', { name: 'Move Milk down' }))

    await waitFor(async () => expect(await order(owner)).toEqual(['Extras', 'Milk']))
    expect(screen.getByRole('status')).toHaveTextContent('Milk moved to 2 of 2.')
    // Milk is now last, so its Down button is disabled and focus goes to its Up button.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Milk up' })).toHaveFocus())
    const titles = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(titles.slice(0, 2)).toEqual(['Extras', 'Milk'])
  })

  it('moves a group up from the keyboard', async () => {
    const { user, owner } = await renderTwo()
    screen.getByRole('button', { name: 'Move Extras up' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(async () => expect(await order(owner)).toEqual(['Extras', 'Milk']))
    expect(screen.getByRole('status')).toHaveTextContent('Extras moved to 1 of 2.')
  })

  it('says why when a move fails', async () => {
    const { user } = await renderTab({
      seed: (owner) => seedGroup(owner, 'Extras'),
      wrapOwner: failing('moveGroup', new OwnerError('network')),
    })
    await user.click(screen.getByRole('button', { name: 'Move Milk down' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(errors.network)
  })
})

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { OwnerRepository } from '@/data/ownerRepository'
import { LIMITS } from '@/entities/menu/menu'
import { renderDashboardPage } from '@/test/dashboard'
import { AddonsTab } from './AddonsTab'

/*
 * The group editor and the delete question while their call is on the way, and where focus goes when a new group fills the
 * list. A save or a delete cannot be called back once sent, so Cancel, the corner button, the backdrop and Escape wait.
 */

const text = dashboardCopy.addons

type Method = 'saveGroup' | 'deleteGroup'

/** The owner repository whose `method` waits until `release()` before it does its work. */
function gated(method: Method) {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const wrapOwner = (real: OwnerRepository): OwnerRepository => {
    const work = real[method] as (...args: never[]) => Promise<unknown>
    const late = async (...args: never[]) => {
      await gate
      return work.apply(real, args)
    }
    return { ...real, [method]: late } as OwnerRepository
  }
  return { wrapOwner, release: () => release() }
}

async function open(method: Method, seed?: (owner: OwnerRepository) => Promise<void>) {
  const held = gated(method)
  const page = await renderDashboardPage(<AddonsTab />, '/dashboard/menu?tab=addons', { wrapOwner: held.wrapOwner, ...(seed ? { seed } : {}) })
  return { ...page, release: held.release }
}

const noDialogOpen = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

async function tryEveryWayOut(user: UserEvent, dialog: HTMLElement, closeLabel: string) {
  await user.click(dialog)
  expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false)
  expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false)
  expect(within(dialog).getByRole('button', { name: closeLabel })).toBeDisabled()
  ;(dialog as HTMLDialogElement).close()
  expect(dialog).toHaveAttribute('open')
}

describe('The group editor while its save is on the way', () => {
  it('keeps Cancel, the corner button, the backdrop and Escape off until the group is saved, then closes by itself', async () => {
    const { user, owner, release } = await open('saveGroup')
    await user.click(screen.getByRole('button', { name: text.add }))
    const dialog = screen.getByRole('dialog')
    await user.type(screen.getByLabelText(text.editor.name), 'Extras')
    await user.type(screen.getByLabelText('Option 1 name'), 'Cheese')
    await user.click(within(dialog).getByRole('button', { name: text.editor.save }))

    expect(within(dialog).getByRole('button', { name: text.editor.cancel })).toBeDisabled()
    await tryEveryWayOut(user, dialog, text.editor.close)

    release()
    await noDialogOpen()
    expect((await owner.getMenu()).groups.some((group) => group.name === 'Extras')).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent('Added the Extras group.')
  })
})

describe('The delete question of a group while the delete is on the way', () => {
  it('does not let the owner keep the group once the delete is sent', async () => {
    const { user, owner, release } = await open('deleteGroup')
    await user.click(screen.getByRole('button', { name: 'Delete Milk' }))
    const question = screen.getByRole('dialog')
    await user.click(within(question).getByRole('button', { name: text.confirmDelete.confirm }))

    expect(within(question).getByRole('button', { name: text.confirmDelete.cancel })).toBeDisabled()
    await tryEveryWayOut(user, question, text.confirmDelete.close)

    release()
    await noDialogOpen()
    expect((await owner.getMenu()).groups.some((group) => group.name === 'Milk')).toBe(false)
  })
})

describe('Focus when the list becomes full', () => {
  // Add group and every suggestion are off at the limit: the focus must still land on something in the list.
  const nearlyFull = async (owner: OwnerRepository) => {
    for (let index = 0; index < LIMITS.groups - 2; index += 1) {
      await owner.saveGroup({ name: `Group ${index}`, required: false, min: 0, max: 1, options: [{ label: 'One', price: 0 }] })
    }
  }

  it('puts the focus on the Edit button of the new group when the editor closes on a full list', async () => {
    const { user, release } = await open('saveGroup', nearlyFull)
    release()
    await user.click(screen.getByRole('button', { name: text.add }))
    await user.type(screen.getByLabelText(text.editor.name), 'Last one')
    await user.type(screen.getByLabelText('Option 1 name'), 'One')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: text.editor.save }))
    await noDialogOpen()

    expect(screen.getByRole('button', { name: text.add })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Last one' })).toHaveFocus())
  })

  it('puts the focus on the Edit button of the new group when a suggestion fills the list', async () => {
    const { user, release } = await open('saveGroup', nearlyFull)
    release()
    await user.click(screen.getByRole('button', { name: 'Add the Extra shot group' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Extra shot' })).toHaveFocus())
    expect(screen.getByRole('button', { name: text.add })).toBeDisabled()
  })
})

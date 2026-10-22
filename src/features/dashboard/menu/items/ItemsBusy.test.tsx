import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { fill } from '@/shared/lib/fill'
import { renderDashboardPage } from '@/test/dashboard'
import { ItemsTab } from './ItemsTab'

/*
 * The questions and editors of the Items tab while their call is on its way. A save, a delete or a switch cannot be
 * called back once sent, so no way out of the dialog may pretend to do it: Cancel, the corner button, the backdrop and
 * Escape all wait until the answer is in. The call is held by a gate the test opens.
 */

const { items, productEditor } = dashboardCopy

type Method = 'saveProduct' | 'deleteProduct' | 'deleteCategory' | 'saveCategory' | 'setAvailable'

/** The owner repository whose `method` waits until `release()` before it does its work, or until `release(error)` before it fails. */
function gated(method: Method) {
  let release: (failure?: Error) => void = () => {}
  const gate = new Promise<Error | undefined>((resolve) => {
    release = resolve
  })
  const wrapOwner = (real: OwnerRepository): OwnerRepository => {
    const work = real[method] as (...args: never[]) => Promise<unknown>
    const late = async (...args: never[]) => {
      const failure = await gate
      if (failure) throw failure
      return work.apply(real, args)
    }
    return { ...real, [method]: late } as OwnerRepository
  }
  return { wrapOwner, release: (failure?: Error) => release(failure) }
}

const open = (method: Method) => {
  const held = gated(method)
  return renderDashboardPage(<ItemsTab />, '/dashboard/menu', { wrapOwner: held.wrapOwner }).then((page) => ({ ...page, release: held.release }))
}

const typeOver = async (user: UserEvent, box: HTMLElement, value: string) => {
  await user.clear(box)
  await user.type(box, value)
}

const noDialogOpen = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

/** Every way out a person has, tried on the open dialog. Each one must leave it open. */
async function tryEveryWayOut(user: UserEvent, dialog: HTMLElement, closeLabel: string) {
  await user.click(dialog)
  expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false)
  expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false)
  expect(within(dialog).getByRole('button', { name: closeLabel })).toBeDisabled()
  // A browser that closed it anyway (a back gesture it did not hold back) gets the dialog back.
  ;(dialog as HTMLDialogElement).close()
  expect(dialog).toHaveAttribute('open')
}

describe('The item editor while its save is on the way', () => {
  it('keeps both edits of an item when the owner tries to cancel a slow save and then edits the item again', async () => {
    const { user, owner, release } = await open('saveProduct')
    await user.click(await screen.findByRole('button', { name: fill(items.product.editLabel, { name: 'Cold Brew' }) }))
    const dialog = await screen.findByRole('dialog', { name: productEditor.editTitle })
    await typeOver(user, within(dialog).getByRole('textbox', { name: productEditor.name }), 'Cold Brew Plus')
    await user.click(within(dialog).getByRole('button', { name: productEditor.save }))

    await waitFor(() => expect(within(dialog).getByRole('button', { name: productEditor.cancel })).toBeDisabled())
    await tryEveryWayOut(user, dialog, productEditor.close)

    release()
    await noDialogOpen()
    // The row is the saved item, so the next editor starts from it.
    await user.click(await screen.findByRole('button', { name: fill(items.product.editLabel, { name: 'Cold Brew Plus' }) }))
    const second = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    await typeOver(user, second.getByRole('textbox', { name: productEditor.description }), 'Steeped for twelve hours.')
    await user.click(second.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()

    const saved = (await owner.getMenu()).products.filter((product) => product.name.startsWith('Cold Brew'))
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ name: 'Cold Brew Plus', description: 'Steeped for twelve hours.' })
  })

  it('closes by itself when the save has landed, and says once what was saved', async () => {
    const { user, release } = await open('saveProduct')
    await user.click(await screen.findByRole('button', { name: fill(items.category.addItemLabel, { name: 'Hot' }) }))
    const dialog = await screen.findByRole('dialog', { name: productEditor.addTitle })
    await user.type(within(dialog).getByRole('textbox', { name: productEditor.name }), 'Mocha')
    await user.type(within(dialog).getByRole('textbox', { name: productEditor.price }), '90')
    await user.click(within(dialog).getByRole('button', { name: productEditor.save }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: productEditor.cancel })).toBeDisabled())
    await tryEveryWayOut(user, dialog, productEditor.close)
    expect(screen.queryByText(fill(items.product.added, { name: 'Mocha' }))).not.toBeInTheDocument()

    release()
    await noDialogOpen()
    expect(await screen.findByText(fill(items.product.added, { name: 'Mocha' }))).toBeInTheDocument()
  })

  it('gives Cancel and the corner button back when the save is refused', async () => {
    const { user, release } = await open('saveProduct')
    await user.click(await screen.findByRole('button', { name: fill(items.category.addItemLabel, { name: 'Hot' }) }))
    const dialog = await screen.findByRole('dialog', { name: productEditor.addTitle })
    await user.type(within(dialog).getByRole('textbox', { name: productEditor.name }), 'Mocha')
    await user.type(within(dialog).getByRole('textbox', { name: productEditor.price }), '90')
    await user.click(within(dialog).getByRole('button', { name: productEditor.save }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: productEditor.cancel })).toBeDisabled())

    release(new OwnerError('network'))
    // The form stays, with its words, and every way out is back.
    await waitFor(() => expect(within(dialog).getByRole('button', { name: productEditor.cancel })).toBeEnabled())
    // The dialog hears that the work ended one commit after the form (useModalBusy is an effect), so it is waited for too.
    await waitFor(() => expect(within(dialog).getByRole('button', { name: productEditor.close })).toBeEnabled())
    await user.click(within(dialog).getByRole('button', { name: productEditor.cancel }))
    await noDialogOpen()
  })
})

describe('The delete questions while the delete is on the way', () => {
  it('does not let the owner keep an item while its delete is already on its way', async () => {
    const { user, owner, release } = await open('deleteProduct')
    await user.click(await screen.findByRole('button', { name: fill(items.product.deleteLabel, { name: 'Cold Brew' }) }))
    const question = await screen.findByRole('dialog')
    await user.click(within(question).getByRole('button', { name: items.product.confirmDelete }))

    expect(within(question).getByRole('button', { name: items.dialog.cancel })).toBeDisabled()
    await tryEveryWayOut(user, question, items.dialog.close)

    release()
    await noDialogOpen()
    expect((await owner.getMenu()).products.some((product) => product.name === 'Cold Brew')).toBe(false)
  })

  it('does the same for the question about a category', async () => {
    const { user, owner, release } = await open('deleteCategory')
    await user.click(await screen.findByRole('button', { name: fill(items.category.deleteLabel, { name: 'Iced' }) }))
    const question = await screen.findByRole('dialog')
    await user.click(within(question).getByRole('button', { name: items.category.confirmDelete }))

    expect(within(question).getByRole('button', { name: items.dialog.cancel })).toBeDisabled()
    await tryEveryWayOut(user, question, items.dialog.close)

    release()
    await noDialogOpen()
    expect((await owner.getMenu()).categories.some((category) => category.name === 'Iced')).toBe(false)
  })
})

describe('Two calls that send the whole item or category', () => {
  it('does not let the owner open an item for editing or delete it while its sold-out switch is still saving', async () => {
    const { user, release } = await open('setAvailable')
    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))

    const edit = screen.getByRole('button', { name: fill(items.product.editLabel, { name: 'Cold Brew' }) })
    expect(edit).toBeDisabled()
    expect(screen.getByRole('button', { name: fill(items.product.deleteLabel, { name: 'Cold Brew' }) })).toBeDisabled()

    release()
    await waitFor(() => expect(edit).toBeEnabled())
  })

  it('keeps a renamed category named as typed when the owner flips its visibility switch at once', async () => {
    const { user, owner, release } = await open('saveCategory')
    await user.click(await screen.findByRole('button', { name: fill(items.category.renameLabel, { name: 'Hot' }) }))
    await typeOver(user, screen.getByRole('textbox', { name: items.category.nameLabel }), 'Coffee')
    await user.click(screen.getByRole('button', { name: items.category.save }))

    const shown = screen.getByRole('switch', { name: `${items.category.visibleLabel}: Hot` })
    expect(shown).toHaveAttribute('aria-disabled', 'true')
    await user.click(shown)
    expect(shown).toHaveAttribute('aria-checked', 'true')

    release()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Coffee' })).toBeInTheDocument())
    const saved = (await owner.getMenu()).categories.find((category) => category.name === 'Coffee')
    expect(saved).toMatchObject({ name: 'Coffee', visible: true })
    expect((await owner.getMenu()).categories.some((category) => category.name === 'Hot')).toBe(false)
  })

  it('does not let the owner rename a category while its visibility switch is still saving', async () => {
    const { user, release } = await open('saveCategory')
    await user.click(await screen.findByRole('switch', { name: `${items.category.visibleLabel}: Hot` }))
    const rename = screen.getByRole('button', { name: fill(items.category.renameLabel, { name: 'Hot' }) })
    expect(rename).toBeDisabled()

    release()
    await waitFor(() => expect(rename).toBeEnabled())
  })
})

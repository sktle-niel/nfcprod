import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'
import { useModalBusy } from './modalBusy'

function setup() {
  const onClose = vi.fn()
  render(
    <Modal title="Get your card" closeLabel="Close" onClose={onClose}>
      <button type="button">Inside the sheet</button>
      <p>Some words in the sheet</p>
    </Modal>,
  )
  // The dialog element is also what the dimmed backdrop is: a click on the backdrop has the dialog as its target.
  const dialog: HTMLElement = screen.getByRole('dialog')
  return { dialog, inside: screen.getByRole('button', { name: 'Inside the sheet' }), onClose, user: userEvent.setup() }
}

/** The mouse goes down on one element, moves to another and is released there, like a drag. */
const drag = (user: ReturnType<typeof userEvent.setup>, from: HTMLElement, to: HTMLElement) =>
  user.pointer([{ keys: '[MouseLeft>]', target: from }, { target: to }, { keys: '[/MouseLeft]' }])

describe('Modal', () => {
  it('opens as a modal dialog named after its title', () => {
    const { dialog } = setup()
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAccessibleName('Get your card')
  })

  it('is described by the element it is pointed at, and by nothing when none is', () => {
    const { unmount } = render(
      <Modal title="Sure?" describedBy="why" closeLabel="Close" onClose={() => {}}>
        <p id="why">Three items go too.</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Three items go too.')
    unmount()
    render(
      <Modal title="Sure?" closeLabel="Close" onClose={() => {}}>
        <p>Three items go too.</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
  })

  it('closes when the dimmed backdrop is clicked', async () => {
    const { dialog, onClose, user } = setup()
    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(dialog).not.toHaveAttribute('open')
  })

  it('stays open when something in the sheet is clicked', async () => {
    const { dialog, inside, onClose, user } = setup()
    await user.click(inside)
    await user.click(screen.getByText('Some words in the sheet'))
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  it('closes from its close button', async () => {
    const { onClose, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // A mouse drag that starts in the sheet (panning the map, selecting text) and lets go over the dimmed area makes the
  // browser send the click to the closest element that holds both ends, which is the dialog itself.
  it('stays open when a drag starts in the sheet and is released over the backdrop', async () => {
    const { dialog, inside, onClose, user } = setup()
    await drag(user, inside, dialog)
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  it('stays open when a drag starts on the backdrop and is released in the sheet', async () => {
    const { dialog, inside, onClose, user } = setup()
    await drag(user, dialog, inside)
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  it('still closes on a click on the backdrop after such a drag', async () => {
    const { dialog, inside, onClose, user } = setup()
    await drag(user, inside, dialog)
    await user.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the press and the release are both on the backdrop, even with a little movement between', async () => {
    const { dialog, onClose, user } = setup()
    await drag(user, dialog, dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // The note of where a press began must not depend on the press reaching the dialog by bubbling: a control in the sheet may
  // stop it. Here an old press on the backdrop ended outside the dialog (no click, so nothing used the note), and the next
  // press starts on such a control.
  it('stays open when a drag starts on a control that stops the press from bubbling and ends on the backdrop', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Get your card" closeLabel="Close" onClose={onClose}>
        <button type="button" onPointerDown={(event) => event.stopPropagation()}>
          Stops presses
        </button>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    const user = userEvent.setup()

    await user.pointer({ keys: '[MouseLeft>]', target: dialog })
    await user.pointer({ keys: '[/MouseLeft]', target: document.body })
    await drag(user, screen.getByRole('button', { name: 'Stops presses' }), dialog)

    expect(onClose).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  // A right-click on the backdrop is a press that never turns into a click, so it must not arm the next one.
  it('stays open when a button in the sheet is used from the keyboard after a right-click on the backdrop', async () => {
    const { dialog, inside, onClose, user } = setup()
    await user.pointer({ keys: '[MouseRight]', target: dialog })
    inside.focus()
    await user.keyboard('{Enter}')
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  // The browser closes the dialog on Escape by itself: first a cancel event, which anything can stop, then the close.
  it('leaves Escape to the browser: the cancel is not stopped, and the close reaches onClose', () => {
    const { dialog, onClose } = setup()
    const cancel = new Event('cancel', { cancelable: true })
    dialog.dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(false)

    ;(dialog as HTMLDialogElement).close()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // Work is running (a save, a delete) and cannot be called back: the person's ways out do nothing until it ends.
  describe('while busy', () => {
    function busySetup() {
      const onClose = vi.fn()
      const ui = (busy: boolean) => (
        <Modal title="Get your card" closeLabel="Close" busy={busy} onClose={onClose}>
          {(close) => (
            <button type="button" onClick={close}>
              Done
            </button>
          )}
        </Modal>
      )
      const view = render(ui(true))
      return { ...view, ui, onClose, dialog: screen.getByRole('dialog') as HTMLDialogElement, user: userEvent.setup() }
    }

    it('turns the corner button off', async () => {
      const { onClose, user } = busySetup()
      const corner = screen.getByRole('button', { name: 'Close' })
      expect(corner).toBeDisabled()
      await user.click(corner)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('ignores a click on the backdrop', async () => {
      const { dialog, onClose, user } = busySetup()
      await user.click(dialog)
      expect(onClose).not.toHaveBeenCalled()
      expect(dialog).toHaveAttribute('open')
    })

    it('stops Escape and the cancel event, and asks the browser not to close it at all', () => {
      const { dialog } = busySetup()
      expect(dialog).toHaveAttribute('closedby', 'none')
      expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false)
      expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false)
    })

    it('opens the dialog again when a browser closed it anyway, without telling the parent', () => {
      const { dialog, onClose } = busySetup()
      dialog.close()
      expect(dialog).toHaveAttribute('open')
      expect(onClose).not.toHaveBeenCalled()
    })

    it('still lets the content close it, for a form that saved', async () => {
      const { dialog, onClose, user } = busySetup()
      await user.click(screen.getByRole('button', { name: 'Done' }))
      expect(dialog).not.toHaveAttribute('open')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('gives every way out back when the work ends', async () => {
      const { dialog, onClose, rerender, ui, user } = busySetup()
      rerender(ui(false))
      expect(dialog).not.toHaveAttribute('closedby')
      expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled()
      await user.click(dialog)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('follows a form inside that says it is busy through useModalBusy, and lets go when it unmounts', () => {
      function Form({ saving }: { saving: boolean }) {
        useModalBusy(saving)
        return <p>Form</p>
      }
      const ui = (saving: boolean) => (
        <Modal title="Edit" closeLabel="Close" onClose={() => {}}>
          <Form saving={saving} />
        </Modal>
      )
      const { rerender } = render(ui(false))
      expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled()
      rerender(ui(true))
      expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
      expect(screen.getByRole('dialog')).toHaveAttribute('closedby', 'none')
      rerender(ui(false))
      expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled()
    })
  })
})

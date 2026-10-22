import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function setup(props: { danger?: boolean; busy?: boolean } = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      title="Delete this item?"
      body="It leaves the menu for good."
      confirmLabel="Delete"
      cancelLabel="Keep it"
      closeLabel="Close"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onConfirm, onCancel, user: userEvent.setup(), dialog: screen.getByRole('dialog') }
}

describe('ConfirmDialog', () => {
  it('is a dialog named by its title and shows the question', () => {
    const { dialog } = setup()
    expect(dialog).toHaveAccessibleName('Delete this item?')
    expect(screen.getByText('It leaves the menu for good.')).toBeInTheDocument()
  })

  it('exposes the sentence about the consequence as the description of the dialog', () => {
    const { dialog } = setup()
    expect(dialog).toHaveAccessibleDescription('It leaves the menu for good.')
  })

  it('puts the main action before Cancel in the page, so the order of Tab follows the screen', () => {
    setup()
    const names = screen.getAllByRole('button').map((button) => button.textContent || button.getAttribute('aria-label'))
    expect(names).toEqual(['Close', 'Delete', 'Keep it'])
  })

  it('confirms without closing by itself, so the parent decides what happens next', async () => {
    const { onConfirm, onCancel, user, dialog } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  it('cancels from the cancel button', async () => {
    const { onConfirm, onCancel, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels from the corner close button', async () => {
    const { onCancel, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when the backdrop is clicked', async () => {
    const { onCancel, onConfirm, user, dialog } = setup()
    await user.click(dialog)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels on Escape, which the browser turns into a close of the dialog', () => {
    const { onCancel, dialog } = setup()
    ;(dialog as HTMLDialogElement).close()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('starts focus on the cancel button of a danger dialog', async () => {
    setup({ danger: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus())
  })

  it('leaves the focus alone when it is not a danger dialog', async () => {
    setup()
    await Promise.resolve()
    expect(screen.getByRole('button', { name: 'Keep it' })).not.toHaveFocus()
  })

  it('gives the confirm button a different look for a danger dialog', () => {
    setup()
    const plain = screen.getByRole('button', { name: 'Delete' }).className
    document.body.innerHTML = ''
    setup({ danger: true })
    expect(screen.getByRole('button', { name: 'Delete' }).className).not.toBe(plain)
  })

  it('disables the confirm button and marks it busy while the action runs', async () => {
    const { onConfirm, user } = setup({ busy: true })
    const confirm = screen.getByRole('button', { name: 'Delete' })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    await user.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  // The action is on its way and cannot be called back, so no way out may pretend to call it off.
  describe('while the action runs', () => {
    it('turns off Cancel and the corner button', () => {
      setup({ busy: true })
      expect(screen.getByRole('button', { name: 'Keep it' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
    })

    it('ignores the backdrop, Escape and the cancel event, and gets the dialog back when a browser closes it anyway', async () => {
      const { onCancel, user, dialog } = setup({ busy: true, danger: true })
      await user.click(dialog)
      const escape = fireEvent.keyDown(dialog, { key: 'Escape' })
      const cancel = fireEvent(dialog, new Event('cancel', { cancelable: true }))
      expect(escape).toBe(false)
      expect(cancel).toBe(false)
      expect(dialog).toHaveAttribute('closedby', 'none')

      ;(dialog as HTMLDialogElement).close()
      expect(dialog).toHaveAttribute('open')
      expect(onCancel).not.toHaveBeenCalled()
    })
  })
})

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImagePicker } from './ImagePicker'

const words = {
  label: 'Logo',
  alt: 'Current logo',
  chooseLabel: 'Choose a picture',
  replaceLabel: 'Replace picture',
  removeLabel: 'Remove picture',
  emptyLabel: 'No picture yet',
}

function setup(props: { value?: string | null; busy?: boolean; error?: string; hint?: string } = {}) {
  const onPick = vi.fn()
  const onRemove = vi.fn()
  const { container } = render(<ImagePicker {...words} value={null} onPick={onPick} onRemove={onRemove} {...props} />)
  const file = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!file) throw new Error('no file input')
  return { onPick, onRemove, file, user: userEvent.setup({ applyAccept: false }) }
}

describe('ImagePicker', () => {
  it('shows the empty words and only a choose button when there is no picture', () => {
    setup()
    expect(screen.getByText('No picture yet')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a picture' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove picture' })).not.toBeInTheDocument()
  })

  it('shows the current picture with its alt text, a replace button and a remove button', () => {
    setup({ value: 'https://example.com/logo.png' })
    expect(screen.getByRole('img', { name: 'Current logo' })).toHaveAttribute('src', 'https://example.com/logo.png')
    expect(screen.getByRole('button', { name: 'Replace picture' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose a picture' })).not.toBeInTheDocument()
    expect(screen.queryByText('No picture yet')).not.toBeInTheDocument()
  })

  it('is a group named by its label', () => {
    setup()
    expect(screen.getByRole('group', { name: 'Logo' })).toBeInTheDocument()
  })

  it('accepts only JPEG, PNG and WebP in the file dialog, and keeps the input out of the tab order', () => {
    const { file } = setup()
    expect(file).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(file).toHaveAttribute('tabindex', '-1')
  })

  it('opens the file input from the choose button', async () => {
    const { file, user } = setup()
    const open = vi.spyOn(file, 'click')
    await user.click(screen.getByRole('button', { name: 'Choose a picture' }))
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('hands the chosen file to onPick without checking it', async () => {
    const { file, onPick, user } = setup()
    const picked = new File(['not really a picture'], 'notes.txt', { type: 'text/plain' })
    // The accept filter is only a hint for the dialog; the caller validates, so a wrong file still arrives.
    await user.upload(file, picked)
    expect(onPick).toHaveBeenCalledWith(picked)
  })

  it('lets the same file be chosen twice in a row', async () => {
    const { file, onPick, user } = setup()
    const picked = new File(['x'], 'a.png', { type: 'image/png' })
    await user.upload(file, picked)
    await user.upload(file, picked)
    expect(onPick).toHaveBeenCalledTimes(2)
  })

  it('calls onRemove from the remove button', async () => {
    const { onRemove, user } = setup({ value: 'https://example.com/logo.png' })
    await user.click(screen.getByRole('button', { name: 'Remove picture' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons and marks the choose button busy while work runs', () => {
    setup({ value: 'https://example.com/logo.png', busy: true })
    const replace = screen.getByRole('button', { name: 'Replace picture' })
    expect(replace).toBeDisabled()
    expect(replace).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Remove picture' })).toBeDisabled()
  })

  it('announces a refusal as an alert, and marks the group so a form can send focus to it', () => {
    setup({ error: 'That picture is too big' })
    expect(screen.getByRole('alert')).toHaveTextContent('That picture is too big')
    const group = screen.getByRole('group', { name: 'Logo' })
    expect(group).toHaveAttribute('data-invalid', 'true')
    expect(group).toHaveAttribute('tabindex', '-1')
  })

  it('has no alert and does not mark the group while there is no refusal', () => {
    setup({ hint: 'JPEG or PNG' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Logo' })
    expect(group).not.toHaveAttribute('data-invalid')
    expect(group).not.toHaveAttribute('tabindex')
  })

  it('moves focus to the replace button when remove is used, so focus does not fall to the page', async () => {
    const { user } = setup({ value: 'https://example.com/logo.png' })
    const remove = screen.getByRole('button', { name: 'Remove picture' })
    remove.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Replace picture' })).toHaveFocus()
  })

  it('gives focus back to the choose button when work ends and focus had fallen to the page', () => {
    const props = { ...words, value: null, onPick: () => {}, onRemove: () => {} }
    const { rerender } = render(<ImagePicker {...props} />)
    const choose = screen.getByRole('button', { name: 'Choose a picture' })
    choose.focus()
    rerender(<ImagePicker {...props} busy />)
    // A browser drops focus from a button that turns disabled; jsdom does not, so it is done here.
    act(() => choose.blur())
    rerender(<ImagePicker {...props} busy={false} />)
    expect(choose).toHaveFocus()
  })

  it('does not take focus from another control when work ends', () => {
    const props = { ...words, value: null, onPick: () => {}, onRemove: () => {} }
    const { rerender } = render(
      <>
        <ImagePicker {...props} busy />
        <button type="button">Elsewhere</button>
      </>,
    )
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    rerender(
      <>
        <ImagePicker {...props} busy={false} />
        <button type="button">Elsewhere</button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })

  it('describes the group with the hint, and with the error instead of the hint when there is one', () => {
    const { unmount } = render(<ImagePicker {...words} value={null} onPick={() => {}} onRemove={() => {}} hint="JPEG or PNG" />)
    expect(screen.getByRole('group', { name: 'Logo' })).toHaveAccessibleDescription('JPEG or PNG')
    unmount()
    render(
      <ImagePicker {...words} value={null} onPick={() => {}} onRemove={() => {}} hint="JPEG or PNG" error="Too big" />,
    )
    expect(screen.getByRole('group', { name: 'Logo' })).toHaveAccessibleDescription('Too big')
    expect(screen.queryByText('JPEG or PNG')).not.toBeInTheDocument()
  })
})

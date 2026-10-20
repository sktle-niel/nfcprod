import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { onMap, openMap, resetKit, setup, text } from './MapPicker.testkit'

// The form's message about the pin ("Pin your delivery spot on the map."): where it sits, and when it goes.
vi.mock('./LeafletMap', async () => ({ LeafletMap: (await import('./MapPicker.fakeMap')).FakeLeafletMap }))
vi.mock('@/data/resolveAddress', () => ({ resolveAddress: vi.fn() }))
beforeEach(resetKit)

const message = copy.order.errors.pin.required
const group = () => screen.getByRole('group', { name: text.title })
const before = (first: Node, second: Node) => (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

describe('MapPicker message about the pin', () => {
  it('sits before the first control, so it is in view where the form sends the keyboard, closed or open', async () => {
    const { user } = setup({ error: message })
    expect(before(screen.getByText(message), screen.getByRole('button', { name: text.open }))).toBe(true)

    await openMap(user)
    const first = screen.getByRole('button', { name: text.useMyLocation })
    expect(first).toHaveAttribute('data-field', 'pin')
    expect(before(screen.getByText(message), first)).toBe(true)
    expect(before(screen.getByText(message), screen.getByRole('region', { name: 'Fake map' }))).toBe(true)
    // It is still read with the control that gets the focus.
    expect(first).toHaveAccessibleDescription(`${text.privacy} ${message}`)
  })

  it('goes away, with the red border, once a pin is saved, and comes back if the pin is taken back', async () => {
    const { user } = setup({ error: message })
    await openMap(user)
    expect(group()).toHaveAttribute('data-invalid')

    await onMap(user, 'tap Lahug')
    expect(screen.queryByText(message)).not.toBeInTheDocument()
    expect(group()).not.toHaveAttribute('data-invalid')
    expect(screen.getByRole('button', { name: text.useMyLocation })).toHaveAccessibleDescription(text.privacy)

    // The form has not looked again, and the pin is missing again: it is still true.
    await onMap(user, 'tap the sea')
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(group()).toHaveAttribute('data-invalid')
  })

  it('goes away, with the red border, when the map cannot work and the order goes without a pin', async () => {
    const { user } = setup({ error: message })
    await openMap(user)
    expect(screen.getByText(message)).toBeInTheDocument()

    await onMap(user, 'break the map')
    expect(screen.getByText(text.unavailable)).toBeInTheDocument()
    expect(screen.queryByText(message)).not.toBeInTheDocument()
    expect(group()).not.toHaveAttribute('data-invalid')
  })

  it('is not shown when the form has none', async () => {
    const { user } = setup()
    expect(group()).not.toHaveAttribute('data-invalid')
    await openMap(user)
    expect(screen.queryByText(message)).not.toBeInTheDocument()
  })
})

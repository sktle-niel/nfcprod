import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FOUND_TEXT, onMap, openMap, resetKit, setup, text } from './MapPicker.testkit'

// What a screen reader is given. A live region is read when something in it changes, and not when it appears with its
// words already in it, so the status line and the search note have to be there first and to change inside.
vi.mock('./LeafletMap', async () => ({ LeafletMap: (await import('./MapPicker.fakeMap')).FakeLeafletMap }))
vi.mock('@/data/resolveAddress', () => ({ resolveAddress: vi.fn() }))
beforeEach(resetKit)

/** The live region that holds the words of the status line. */
const statusLine = (words: string) => screen.getByText(words).closest('[role="status"]')

describe('MapPicker status line', () => {
  it('is a live region, and the same one while its words change', async () => {
    const { user } = setup()
    await openMap(user)
    const line = statusLine(text.hint)
    expect(line).toBeInTheDocument()

    await onMap(user, 'tap while zoomed out')
    expect(statusLine(text.zoomIn)).toBe(line)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(statusLine(FOUND_TEXT)).toBe(line)
  })

  it('sits above the map, where the order bar of a phone does not cover it, and the buttons come after the map', async () => {
    const { user } = setup()
    await openMap(user)
    const line = statusLine(text.hint)!
    const map = screen.getByRole('region', { name: 'Fake map' })
    const pinHere = screen.getByRole('button', { name: text.pinHere })
    expect(line.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(map.compareDocumentPosition(pinHere) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('says the same words again as a new node, so that a screen reader reads them again', async () => {
    const { user } = setup()
    await openMap(user)

    await onMap(user, 'tap while zoomed out')
    const first = screen.getByText(text.zoomIn)
    await onMap(user, 'tap while zoomed out')
    const second = screen.getByText(text.zoomIn)
    expect(second).not.toBe(first)
    expect(first).not.toBeInTheDocument()
  })

  it('does the same for a spot that is refused again', async () => {
    const { user } = setup()
    await openMap(user)

    await onMap(user, 'tap the sea')
    const first = screen.getByText(text.status.outside)
    await onMap(user, 'tap the sea')
    expect(screen.getByText(text.status.outside)).not.toBe(first)
  })

  it('does not say a message again when nothing in it changed, as the map is zoomed', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    const found = await screen.findByText(FOUND_TEXT)

    await onMap(user, 'zoom in the fake map')
    await onMap(user, 'zoom in the fake map')
    expect(screen.getByText(FOUND_TEXT)).toBe(found)
  })

  it('says each time that the map moved to a place the customer chose, even the same place', async () => {
    const { user } = setup()
    await openMap(user)
    const box = () => screen.getByRole('searchbox', { name: text.searchLabel })
    const choose = async () => {
      await user.clear(box())
      await user.type(box(), 'lahug{Enter}')
      await user.click(await screen.findByRole('button', { name: 'Lahug, Cebu City, Central Visayas' }))
    }

    await choose()
    const first = screen.getByText(text.status.moved)
    const line = statusLine(text.status.moved)
    await choose()
    expect(screen.getByText(text.status.moved)).not.toBe(first)
    expect(statusLine(text.status.moved)).toBe(line)
  })
})

describe('MapPicker search note', () => {
  it('is in the page while the search has nothing to say, and says its words in the same place', async () => {
    const { user } = setup()
    await openMap(user)
    const note = within(screen.getByRole('search')).getByRole('status')
    expect(note).toBeEmptyDOMElement()

    await user.type(screen.getByRole('searchbox', { name: text.searchLabel }), 'lahug{Enter}')
    expect(await screen.findByText(text.results)).toBeInTheDocument()
    expect(within(screen.getByRole('search')).getByRole('status')).toBe(note)
    expect(note).toHaveTextContent(text.results)
  })
})

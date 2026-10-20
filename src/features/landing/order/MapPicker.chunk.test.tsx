import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { fakeGeocoder } from '@/test/geocoder'
import { fakeLocations } from '@/test/locations'
import { FakeLeafletMap } from './MapPicker.fakeMap'

// The map's code never becomes a map, in four ways. Each test gives './LeafletMap' its own mock and loads the picker
// fresh, because the lazy map is loaded once per page load and a failure stays: that is what a customer gets too.
const text = copy.order.map

afterEach(() => {
  vi.useRealTimers()
  vi.doUnmock('./LeafletMap')
})

async function openPicker(mock: () => object | Promise<object>) {
  vi.resetModules()
  vi.doMock('./LeafletMap', mock)
  const { MapPicker } = await import('./MapPicker')
  const reverse = vi.fn(fakeGeocoder().reverse)
  render(
    <form aria-label="order">
      <MapPicker locations={fakeLocations()} geocoder={{ ...fakeGeocoder(), reverse }} onResolved={vi.fn()} />
    </form>,
  )
  // A click, not a typed press: the tests that fake the clock need nothing to wait on a timer of their own.
  fireEvent.click(screen.getByRole('button', { name: text.open }))
  return { reverse }
}

/** What the order form would send. */
const sent = () => Object.fromEntries(new FormData(screen.getByRole('form', { name: 'order' })) as unknown as Iterable<[string, string]>)

/** Lets the clock run, and every promise that waits on it. */
const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

/** The order can go on, without a pin, and nothing else of the picker is left. */
function expectWaived() {
  expect(screen.getByText(text.unavailable)).toBeInTheDocument()
  expect(screen.queryByText(text.loading)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: text.useMyLocation })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: text.open })).not.toBeInTheDocument()
  expect(sent()).toEqual({ mapUnavailable: '1' })
}

describe('MapPicker when the map code cannot be fetched', () => {
  it('says the map could not load, and lets the order go without a pin', async () => {
    const { reverse } = await openPicker(() => {
      throw new Error('Failed to fetch dynamically imported module')
    })

    expect(await screen.findByText(text.unavailable)).toBeInTheDocument()
    expectWaived()
    expect(reverse).not.toHaveBeenCalled()
  })

  // In a production build Vite wraps the import in a step that also waits for the chunk's stylesheet, and that step
  // throws before the import's own promise exists. A catch written on the import never sees it, and the route crashed
  // instead of letting the order go on. jsdom has no such step; a module whose export cannot be read is the closest thing:
  // the import itself answers, and what comes after it fails.
  it('lets the order go on when the code arrives but cannot be handed over', async () => {
    await openPicker(() => ({
      get LeafletMap(): never {
        throw new Error('The stylesheet of the map could not be loaded')
      },
    }))

    expect(await screen.findByText(text.unavailable)).toBeInTheDocument()
    expectWaived()
  })
})

describe('MapPicker when the map code is slow', () => {
  it('waits for it, then lets the order go on without a pin after the same patience as the tiles (15 seconds)', async () => {
    // The clock is faked before "Open the map" is pressed: the wait starts when the map is asked for.
    vi.useFakeTimers()
    await openPicker(() => new Promise<never>(() => {}))

    expect(screen.getByText(text.loading)).toBeInTheDocument()
    await wait(14_900)
    expect(screen.getByText(text.loading)).toBeInTheDocument()
    expect(screen.queryByText(text.unavailable)).not.toBeInTheDocument()
    expect(sent()).toEqual({})

    await wait(200)
    expectWaived()
  })

  it('keeps the map, and stops the clock, when the code arrives in time', async () => {
    vi.useFakeTimers()
    await openPicker(async () => {
      // Late, but not too late: five seconds of the fifteen.
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      return { LeafletMap: FakeLeafletMap }
    })

    await wait(4_900)
    expect(screen.getByText(text.loading)).toBeInTheDocument()
    await wait(200)
    expect(screen.getByRole('region', { name: 'Fake map' })).toBeInTheDocument()

    // No clock is left running, so the map is not taken away later.
    expect(vi.getTimerCount()).toBe(0)
    await wait(60_000)
    expect(screen.getByRole('region', { name: 'Fake map' })).toBeInTheDocument()
    expect(screen.queryByText(text.unavailable)).not.toBeInTheDocument()
    expect(sent()).toEqual({})
  })
})

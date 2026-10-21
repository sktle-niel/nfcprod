import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchHit } from '@/data/geocoder'
import type { AddressHint } from '@/entities/location/match'
import { LAHUG_HINT } from '@/test/geocoder'
import { deferred } from '@/test/locations'
import { FOUND, FOUND_TEXT, onMap, openMap, resetKit, seen, sent, setup, stubGeolocation, text } from './MapPicker.testkit'

// What happens to an answer that is still on its way when something newer happens. jsdom cannot draw a map: the panel gets
// a fake one. The matcher has its own tests: here the lookup is told what it found (the kit resets it before each test).
vi.mock('./PinMap', async () => ({ PinMap: (await import('./MapPicker.fakeMap')).FakePinMap }))
vi.mock('@/data/resolveAddress', () => ({ resolveAddress: vi.fn() }))
beforeEach(resetKit)

describe('MapPicker when a lookup is still running and a pin is taken back', () => {
  it('forgets the lookup of a pin that a tap outside the Philippines took back, and stops asking for it', async () => {
    const lookup = deferred<AddressHint>()
    const { user, reverse, onResolved } = setup({ geocoder: { reverse: () => lookup.promise } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    const signal = reverse.mock.calls[0]?.[1]
    expect(signal?.aborted).toBe(false)

    // Just outside the box, where the map is still allowed to go: the pin is taken back, and so is its lookup.
    await onMap(user, 'tap the sea')
    expect(screen.getByText(text.status.outside)).toBeInTheDocument()
    expect(signal?.aborted).toBe(true)

    await act(async () => lookup.resolve(LAHUG_HINT))
    expect(screen.getByText(text.status.outside)).toBeInTheDocument()
    expect(seen(FOUND_TEXT)).not.toBeInTheDocument()
    expect(onResolved).not.toHaveBeenCalled()
    expect(sent()).toEqual({})
  })
})

describe('MapPicker when the current location is asked for while a lookup is running', () => {
  it('lets the lookup of the saved pin go on, and fills the address when the device says no', async () => {
    const device = stubGeolocation()
    const lookup = deferred<AddressHint>()
    const { user, reverse, onResolved } = setup({ geocoder: { reverse: () => lookup.promise } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    const signal = reverse.mock.calls[0]?.[1]

    await onMap(user, text.useMyLocation)
    expect(screen.getByText(text.locating)).toBeInTheDocument()
    expect(signal?.aborted).toBe(false)

    await act(async () => device.fail(1))
    expect(screen.getByText(text.location.denied)).toBeInTheDocument()
    expect(signal?.aborted).toBe(false)
    expect(onResolved).not.toHaveBeenCalled()

    // The pin was never in doubt: its address comes, and it is the one in the form.
    await act(async () => lookup.resolve(LAHUG_HINT))
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith(FOUND)
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
  })

  it('still says the device said no when the lookup ended first', async () => {
    const device = stubGeolocation()
    const lookup = deferred<AddressHint>()
    const { user, onResolved } = setup({ geocoder: { reverse: () => lookup.promise } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    await onMap(user, text.useMyLocation)

    // The address of the pin comes while the device is still thinking...
    await act(async () => lookup.resolve(LAHUG_HINT))
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)

    // ...and the device's own answer is not lost for it.
    await act(async () => device.fail(3))
    expect(screen.getByText(text.location.timeout)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
  })

  it('leaves the lookup of the saved pin alone when the fix is outside the Philippines', async () => {
    const device = stubGeolocation()
    const lookup = deferred<AddressHint>()
    const { user, reverse, onResolved } = setup({ geocoder: { reverse: () => lookup.promise } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    const signal = reverse.mock.calls[0]?.[1]

    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 35.68, longitude: 139.69, accuracy: 10 }))
    expect(screen.getByText(text.status.outside)).toBeInTheDocument()
    expect(signal?.aborted).toBe(false)
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })

    await act(async () => lookup.resolve(LAHUG_HINT))
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledWith(FOUND)
  })

  it('lets a usable fix take over: the pin and the lookup before it are old news', async () => {
    const device = stubGeolocation()
    const late = deferred<AddressHint>()
    const { user, reverse, onResolved } = setup({
      // Lahug waits, Makati (the fix) answers at once.
      geocoder: { reverse: async (pin) => (pin.lat > 14 ? LAHUG_HINT : late.promise) },
    })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    const first = reverse.mock.calls[0]?.[1]
    await onMap(user, text.useMyLocation)
    expect(first?.aborted).toBe(false)

    await act(async () => device.succeed({ latitude: 14.5547, longitude: 121.0244, accuracy: 8 }))
    expect(first?.aborted).toBe(true)
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(sent()).toEqual({ lat: '14.55470', lng: '121.02440' })
    expect(onResolved).toHaveBeenCalledTimes(1)

    await act(async () => late.resolve(LAHUG_HINT))
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(sent()).toEqual({ lat: '14.55470', lng: '121.02440' })
  })
})

describe('MapPicker when a search is replaced by a newer one', () => {
  const box = () => screen.getByRole('searchbox', { name: text.searchLabel })

  it('does not say the search failed because the first one was cancelled', async () => {
    const second = deferred<SearchHit[]>()
    // Like the real geocoder: a search that is cancelled fails at once, with the reason it was cancelled for.
    const search = vi.fn((query: string, signal: AbortSignal) =>
      query === 'second'
        ? second.promise
        : new Promise<SearchHit[]>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
    )
    const { user } = setup({ geocoder: { search } })
    await openMap(user)

    await user.type(box(), 'first{Enter}')
    expect(screen.getByText(text.searching)).toBeInTheDocument()
    await user.clear(box())
    await user.type(box(), 'second{Enter}')

    expect(search.mock.calls[0]?.[1]?.aborted).toBe(true)
    expect(screen.getByText(text.searching)).toBeInTheDocument()
    expect(seen(text.searchFailed)).not.toBeInTheDocument()

    await act(async () => second.resolve([{ label: 'Second place', pin: { lat: 10.3, lng: 123.9 } }]))
    expect(await screen.findByRole('button', { name: 'Second place' })).toBeInTheDocument()
    expect(seen(text.searchFailed)).not.toBeInTheDocument()
  })
})

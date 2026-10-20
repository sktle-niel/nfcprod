import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { GeocoderError, type SearchHit } from '@/data/geocoder'
import { resolveAddress } from '@/data/resolveAddress'
import type { AddressHint } from '@/entities/location/match'
import { LAHUG_HINT } from '@/test/geocoder'
import { CEBU, deferred } from '@/test/locations'
import {
  FOUND,
  FOUND_TEXT,
  HITS,
  MAKATI_HINT,
  onMap,
  openMap,
  PARTIAL,
  PARTIAL_TEXT,
  resetKit,
  seen,
  sent,
  setup,
  stubGeolocation,
  text,
} from './MapPicker.testkit'

// jsdom cannot draw a map: the panel gets a fake one with buttons for a tap, a failure and so on.
vi.mock('./LeafletMap', async () => {
  const { FakeLeafletMap } = await import('./MapPicker.fakeMap')
  return { LeafletMap: FakeLeafletMap }
})

// The matcher has its own tests. Here the lookup is told what it found.
vi.mock('@/data/resolveAddress', () => ({ resolveAddress: vi.fn() }))

beforeEach(resetKit)

describe('MapPicker before the map is opened', () => {
  it('says what the pin is for and what leaves the device, and asks for nothing yet', () => {
    const { reverse, search } = setup()
    expect(screen.getByRole('group', { name: text.title })).toBeInTheDocument()
    expect(screen.getByText(text.intro)).toBeInTheDocument()
    expect(screen.getByText(text.privacy)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.open })).toBeInTheDocument()

    expect(screen.queryByRole('region', { name: 'Fake map' })).not.toBeInTheDocument()
    expect(reverse).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled()
    expect(sent()).toEqual({})
  })

  it('marks its first control for the form, and reads the privacy note with it', () => {
    setup()
    const open = screen.getByRole('button', { name: text.open })
    expect(open).toHaveAttribute('data-field', 'pin')
    expect(open).toHaveAccessibleDescription(text.privacy)
  })

  it('shows the form message, and reads it with the first control', () => {
    setup({ error: copy.order.errors.pin.required })
    expect(screen.getByText(copy.order.errors.pin.required)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.open })).toHaveAccessibleDescription(
      `${text.privacy} ${copy.order.errors.pin.required}`,
    )
    expect(screen.getByRole('group', { name: text.title })).toHaveAttribute('data-invalid')
  })
})

describe('MapPicker when the map opens', () => {
  it('replaces the button with the map and keeps the keyboard inside the panel', async () => {
    const { user } = setup({ error: copy.order.errors.pin.required })
    await openMap(user)

    expect(screen.queryByRole('button', { name: text.open })).not.toBeInTheDocument()
    const first = screen.getByRole('button', { name: text.useMyLocation })
    expect(first).toHaveFocus()
    // The form can still send the customer to the first control, and it still carries the message.
    expect(first).toHaveAttribute('data-field', 'pin')
    expect(first).toHaveAccessibleDescription(`${text.privacy} ${copy.order.errors.pin.required}`)
    expect(screen.getByText(text.hint)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.pinHere })).toBeEnabled()
  })

  it('does not ask for the position, or look anything up, on its own', async () => {
    const getCurrentPosition = stubGeolocation()
    const { user, reverse, search } = setup()
    await openMap(user)
    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(reverse).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled()
  })
})

describe('MapPicker placing a pin', () => {
  it('saves the pin at once, rounded to five decimals, and fills the address when the lookup is done', async () => {
    const lookup = deferred<AddressHint>()
    const { user, reverse, onResolved } = setup({ geocoder: { reverse: () => lookup.promise } })
    await openMap(user)
    await onMap(user, 'tap Lahug')

    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
    expect(screen.getByText('pin 10.32812,123.90642')).toBeInTheDocument()
    expect(screen.getByText(text.status.looking)).toBeInTheDocument()
    expect(reverse).toHaveBeenCalledWith({ lat: 10.32812, lng: 123.90642 }, expect.any(AbortSignal))
    expect(onResolved).not.toHaveBeenCalled()

    await act(async () => lookup.resolve(LAHUG_HINT))
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith(FOUND)
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
  })

  it('fills a spot in Lahug through the real matcher and the fake place lists', async () => {
    const real = await vi.importActual<typeof import('@/data/resolveAddress')>('@/data/resolveAddress')
    vi.mocked(resolveAddress).mockImplementation(real.resolveAddress)
    const { user, onResolved } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')

    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith(FOUND)
  })

  it('says what part of the address it could fill when only part matched', async () => {
    vi.mocked(resolveAddress).mockResolvedValue(PARTIAL)
    const { user, onResolved } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(PARTIAL_TEXT)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledWith(PARTIAL)
  })

  it('says so when nothing matched, reports it, and keeps the pin', async () => {
    vi.mocked(resolveAddress).mockResolvedValue({})
    const { user, onResolved } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(text.status.none)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith({})
    expect(sent()).toMatchObject({ lat: '10.32812' })
  })

  it('treats a street alone as no match', async () => {
    vi.mocked(resolveAddress).mockResolvedValue({ street: '12 Salinas Drive' })
    const { user, onResolved } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(text.status.none)).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledWith({ street: '12 Salinas Drive' })
  })

  it.each([
    ['the service is busy', new GeocoderError('busy'), text.status.busy],
    ['the service cannot be reached', new GeocoderError('unavailable'), text.status.offline],
    ['the answer cannot be used', new Error('bad body'), text.status.offline],
  ])('keeps the pin and says so when %s', async (_name, failure, message) => {
    const { user, onResolved } = setup({ geocoder: { reverse: () => Promise.reject(failure) } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
    // A lookup that ended with nothing still ends: the form drops a street suggested for the spot before.
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith({})
  })

  it('keeps the pin and says so when the place lists cannot be loaded', async () => {
    vi.mocked(resolveAddress).mockRejectedValue(new Error('lists are down'))
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(text.status.offline)).toBeInTheDocument()
    expect(sent()).toMatchObject({ lat: '10.32812' })
  })

  it('takes the pin back when the service says the spot is outside the Philippines', async () => {
    const { user, onResolved } = setup({ geocoder: { reverse: () => Promise.reject(new GeocoderError('outside')) } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(await screen.findByText(text.status.outside)).toBeInTheDocument()
    expect(sent()).toEqual({})
    expect(screen.getByText('no pin')).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledWith({})
  })

  it('refuses a spot outside the country without asking the service, and drops the pin it had', async () => {
    const { user, reverse } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    await screen.findByText(FOUND_TEXT)
    expect(reverse).toHaveBeenCalledTimes(1)

    await onMap(user, 'tap the sea')
    expect(screen.getByText(text.status.outside)).toBeInTheDocument()
    expect(sent()).toEqual({})
    expect(reverse).toHaveBeenCalledTimes(1)
  })

  it('asks to zoom in, and places nothing, when the map is too far out', async () => {
    const { user, reverse } = setup()
    await openMap(user)
    await onMap(user, 'tap while zoomed out')
    expect(screen.getByText(text.zoomIn)).toBeInTheDocument()
    expect(sent()).toEqual({})
    expect(reverse).not.toHaveBeenCalled()
  })

  it('takes back the "zoom in closer" message once the map is zoomed in, and leaves any other message alone', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'tap while zoomed out')
    expect(screen.getByText(text.zoomIn)).toBeInTheDocument()

    await onMap(user, 'zoom in the fake map')
    expect(seen(text.zoomIn)).not.toBeInTheDocument()
    expect(screen.getByText(text.hint)).toBeInTheDocument()

    await onMap(user, 'tap Lahug')
    await screen.findByText(FOUND_TEXT)
    await onMap(user, 'zoom in the fake map')
    expect(screen.getByText(FOUND_TEXT)).toBeInTheDocument()
  })

  it('pins the center of the map for people who cannot tap it, under the same zoom rule', async () => {
    const { user, reverse } = setup()
    await openMap(user)
    await onMap(user, text.pinHere)
    expect(sent()).toEqual({ lat: '10.31000', lng: '123.89000' })
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(reverse).toHaveBeenCalledTimes(1)

    await onMap(user, 'zoom out the fake map')
    await onMap(user, text.pinHere)
    expect(screen.getByText(text.zoomIn)).toBeInTheDocument()
    // The pin that was saved stays.
    expect(sent()).toEqual({ lat: '10.31000', lng: '123.89000' })
  })

  it('ignores a late answer for an older pin, and stops asking for it', async () => {
    const late = deferred<AddressHint>()
    const { user, reverse, onResolved } = setup({
      geocoder: { reverse: async (pin) => (pin.lat > 14 ? MAKATI_HINT : late.promise) },
    })
    vi.mocked(resolveAddress).mockImplementation(async (hint) => (hint === MAKATI_HINT ? { province: CEBU } : FOUND))
    await openMap(user)

    await onMap(user, 'tap Lahug')
    await onMap(user, 'tap Makati')
    expect(await screen.findByText(text.status.partial.replace('{place}', 'Cebu'))).toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith({ province: CEBU })
    const firstCall = reverse.mock.calls[0]
    expect(firstCall?.[1]?.aborted).toBe(true)

    // The first answer comes in after all that.
    await act(async () => late.resolve(LAHUG_HINT))
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(seen(FOUND_TEXT)).not.toBeInTheDocument()
    expect(sent()).toEqual({ lat: '14.55470', lng: '121.02440' })
  })

  it('ignores a late failure for an older pin too', async () => {
    const late = deferred<AddressHint>()
    const { user, onResolved } = setup({
      geocoder: { reverse: async (pin) => (pin.lat > 14 ? LAHUG_HINT : late.promise) },
    })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    await onMap(user, 'tap Makati')
    await screen.findByText(FOUND_TEXT)

    await act(async () => late.reject(new GeocoderError('outside')))
    expect(seen(text.status.outside)).not.toBeInTheDocument()
    expect(sent()).toEqual({ lat: '14.55470', lng: '121.02440' })
    expect(onResolved).toHaveBeenCalledTimes(1)
  })

  it('stops the lookup in flight when the panel is closed, and reports nothing after', async () => {
    const lookup = deferred<AddressHint>()
    const { user, reverse, onResolved, unmount } = setup({ geocoder: { reverse: () => lookup.promise } })
    await openMap(user)
    await onMap(user, 'tap Lahug')
    const signal = reverse.mock.calls[0]?.[1]
    expect(signal?.aborted).toBe(false)

    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => lookup.resolve(LAHUG_HINT))
    expect(onResolved).not.toHaveBeenCalled()
  })
})

describe('MapPicker using the current location', () => {
  it('asks the device only when the button is pressed, for a precise fix, and for ten seconds at most', async () => {
    const device = stubGeolocation()
    const { user } = setup()
    await openMap(user)
    expect(device).not.toHaveBeenCalled()

    await onMap(user, text.useMyLocation)
    expect(device).toHaveBeenCalledTimes(1)
    expect(device.mock.calls[0]?.[2]).toEqual({ enableHighAccuracy: true, timeout: 10_000 })
    expect(screen.getByText(text.locating)).toBeInTheDocument()
  })

  it('places the pin at a good fix, looks the map there, and fills the address', async () => {
    const device = stubGeolocation()
    const { user, onResolved } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)

    await act(async () => device.succeed({ latitude: 10.328123, longitude: 123.906417, accuracy: 12 }))
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
    expect(screen.getByText('view 10.32812,123.90642 zoom 17')).toBeInTheDocument()
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(seen(text.location.coarse)).not.toBeInTheDocument()
    expect(onResolved).toHaveBeenCalledWith(FOUND)
  })

  it('still places the pin at a weak fix, and asks the customer to drag it to the door', async () => {
    const device = stubGeolocation()
    const { user } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)

    await act(async () => device.succeed({ latitude: 10.328123, longitude: 123.906417, accuracy: 450 }))
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
    expect(screen.getByText('view 10.32812,123.90642 zoom 16')).toBeInTheDocument()
    expect(await screen.findByText(`${FOUND_TEXT} ${text.location.coarse}`)).toBeInTheDocument()
  })

  it('treats a fix with no accuracy as a weak one', async () => {
    const device = stubGeolocation()
    const { user } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 10.328, longitude: 123.906, accuracy: Number.NaN }))
    expect(await screen.findByText(`${FOUND_TEXT} ${text.location.coarse}`)).toBeInTheDocument()
  })

  it('counts a fix of exactly 200 meters as good and 201 as weak', async () => {
    const device = stubGeolocation()
    const { user } = setup()
    await openMap(user)

    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 10.328123, longitude: 123.906417, accuracy: 200 }))
    expect(await screen.findByText(FOUND_TEXT)).toBeInTheDocument()
    expect(screen.queryByText(text.location.coarse, { exact: false })).not.toBeInTheDocument()

    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 10.328123, longitude: 123.906417, accuracy: 201 }))
    expect(await screen.findByText(`${FOUND_TEXT} ${text.location.coarse}`)).toBeInTheDocument()
  })

  it.each([
    ['busy', new GeocoderError('busy'), text.status.busy],
    ['out of reach', new GeocoderError('unavailable'), text.status.offline],
  ])('still asks the customer to check a weak fix when the address service is %s', async (_name, failure, message) => {
    const device = stubGeolocation()
    const { user } = setup({ geocoder: { reverse: () => Promise.reject(failure) } })
    await openMap(user)
    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 10.328123, longitude: 123.906417, accuracy: 450 }))
    expect(await screen.findByText(`${message} ${text.location.coarse}`)).toBeInTheDocument()
  })

  it.each([
    ['denied', 1, text.location.denied],
    ['not available', 2, text.location.unavailable],
    ['too slow', 3, text.location.timeout],
  ])('tells the customer to place the pin on the map when the location is %s', async (_name, code, message) => {
    const device = stubGeolocation()
    const { user, reverse } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)

    await act(async () => device.fail(code))
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(sent()).toEqual({})
    expect(reverse).not.toHaveBeenCalled()
  })

  it('says so when the browser has no location service at all', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)
    expect(screen.getByText(text.location.unavailable)).toBeInTheDocument()
  })

  it('says so when the browser throws as soon as it is asked', async () => {
    stubGeolocation({ throws: true })
    const { user } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)
    expect(screen.getByText(text.location.unavailable)).toBeInTheDocument()
  })

  it('refuses a position outside the Philippines and leaves the map where it is', async () => {
    const device = stubGeolocation()
    const { user, reverse } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 35.68, longitude: 139.69, accuracy: 10 }))

    expect(screen.getByText(text.status.outside)).toBeInTheDocument()
    expect(sent()).toEqual({})
    expect(screen.getByText('no view')).toBeInTheDocument()
    expect(reverse).not.toHaveBeenCalled()
  })

  it('keeps the pin the customer already placed when the position is outside the Philippines', async () => {
    const device = stubGeolocation()
    const { user, reverse } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    await screen.findByText(FOUND_TEXT)

    await onMap(user, text.useMyLocation)
    await act(async () => device.succeed({ latitude: 35.68, longitude: 139.69, accuracy: 10 }))

    // Only the position was refused, not the pin: it stays saved, on the map and in the form, where the map still looks.
    expect(screen.getByText(text.status.outside)).toBeInTheDocument()
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642' })
    expect(screen.getByText('pin 10.32812,123.90642')).toBeInTheDocument()
    expect(screen.getByText('no view')).toBeInTheDocument()
    expect(reverse).toHaveBeenCalledTimes(1)
  })

  it('lets a tap on the map win over a fix that arrives later', async () => {
    const device = stubGeolocation()
    const { user } = setup()
    await openMap(user)
    await onMap(user, text.useMyLocation)
    await onMap(user, 'tap Makati')

    await act(async () => device.succeed({ latitude: 10.328, longitude: 123.906, accuracy: 5 }))
    expect(sent()).toEqual({ lat: '14.55470', lng: '121.02440' })
    expect(screen.getByText('no view')).toBeInTheDocument()
  })
})

describe('MapPicker searching for a place', () => {
  const box = () => screen.getByRole('searchbox', { name: text.searchLabel })

  it('searches when the customer submits, and never while they type', async () => {
    const { user, search } = setup()
    await openMap(user)
    await user.type(box(), 'lahug')
    expect(search).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('lahug', expect.any(AbortSignal))
    expect(await screen.findByText(text.results)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: text.results })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lahug, Cebu City, Central Visayas' })).toBeInTheDocument()
    expect(screen.getByText(text.attributionNote)).toBeInTheDocument()
  })

  it('also searches from the button, and sends the words without the spaces around them', async () => {
    const { user, search } = setup()
    await openMap(user)
    await user.type(box(), '  sm city  ')
    await user.click(screen.getByRole('button', { name: text.searchSubmit }))
    expect(search).toHaveBeenCalledWith('sm city', expect.any(AbortSignal))
  })

  it('does not search on the Enter that only confirms a word being composed', async () => {
    const { user, search } = setup()
    await openMap(user)
    await user.type(box(), 'lahug')
    fireEvent.keyDown(box(), { key: 'Enter', isComposing: true })
    expect(search).not.toHaveBeenCalled()

    fireEvent.keyDown(box(), { key: 'Enter' })
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('stops the customer at 100 characters', async () => {
    const { user } = setup()
    await openMap(user)
    await user.type(box(), 'a'.repeat(150))
    expect(box()).toHaveValue('a'.repeat(100))
  })

  it('does not send the order, and does not put the search in it', async () => {
    const { user, submitted } = setup()
    await openMap(user)
    await user.type(box(), 'lahug{Enter}')
    await user.click(screen.getByRole('button', { name: text.searchSubmit }))
    expect(submitted).not.toHaveBeenCalled()
    expect(sent()).toEqual({})
  })

  it('asks for nothing when the box is empty', async () => {
    const { user, search } = setup()
    await openMap(user)
    await user.type(box(), '   {Enter}')
    await user.click(screen.getByRole('button', { name: text.searchSubmit }))
    expect(search).not.toHaveBeenCalled()
  })

  it('shows at most five results, as plain text', async () => {
    const hostile = '<img src=x onerror=alert(1)> Lahug'
    const many: SearchHit[] = Array.from({ length: 8 }, (_unused, index) => ({
      label: index === 0 ? hostile : `Place ${index}`,
      pin: { lat: 10 + index / 100, lng: 123.9 },
    }))
    const { user } = setup({ geocoder: { search: async () => many } })
    await openMap(user)
    await user.type(box(), 'place{Enter}')

    const list = await screen.findByRole('list', { name: text.results })
    expect(list.querySelectorAll('button')).toHaveLength(5)
    expect(screen.getByRole('button', { name: hostile })).toBeInTheDocument()
    expect(list.querySelector('img')).toBeNull()
  })

  it('moves the map to the chosen place, says so, but leaves placing the pin to the customer', async () => {
    const { user, reverse } = setup()
    await openMap(user)
    await user.type(box(), 'lahug{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Lahug, Cebu City, Central Visayas' }))

    expect(screen.getByText('view 10.328,123.906 zoom 16')).toBeInTheDocument()
    expect(screen.getByText('no pin')).toBeInTheDocument()
    expect(sent()).toEqual({})
    expect(reverse).not.toHaveBeenCalled()
    // The old hint no longer stands: the customer is told the map moved and what to do next.
    expect(screen.getByText(text.status.moved)).toBeInTheDocument()
    expect(seen(text.hint)).not.toBeInTheDocument()
    // The list has done its job, and the keyboard goes to the map so the arrow keys work.
    expect(screen.queryByRole('list', { name: text.results })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Fake map' })).toHaveFocus()
  })

  it('does not move the map to a result that is not a place on the map', async () => {
    const nowhere: SearchHit[] = [{ label: 'Nowhere', pin: { lat: Number.NaN, lng: 500 } }]
    const { user } = setup({ geocoder: { search: async () => nowhere } })
    await openMap(user)
    await user.type(box(), 'nowhere{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Nowhere' }))
    expect(screen.getByText('no view')).toBeInTheDocument()
    expect(seen(text.status.moved)).not.toBeInTheDocument()
  })

  it('says so when there are no results, and when the search could not be done', async () => {
    const answers: Array<() => Promise<SearchHit[]>> = [async () => [], () => Promise.reject(new GeocoderError('busy'))]
    const { user } = setup({ geocoder: { search: () => answers.shift()!() } })
    await openMap(user)

    await user.type(box(), 'zzz{Enter}')
    expect(await screen.findByText(text.noResults)).toBeInTheDocument()

    await user.type(box(), '{Enter}')
    expect(await screen.findByText(text.searchFailed)).toBeInTheDocument()
    expect(seen(text.noResults)).not.toBeInTheDocument()
  })

  it('shows only the newest search, and aborts the one before it', async () => {
    const slow = deferred<SearchHit[]>()
    const answers = [slow.promise, Promise.resolve<SearchHit[]>([{ label: 'Second place', pin: { lat: 10.3, lng: 123.9 } }])]
    const { user, search } = setup({ geocoder: { search: () => answers.shift()! } })
    await openMap(user)

    await user.type(box(), 'first{Enter}')
    expect(screen.getByText(text.searching)).toBeInTheDocument()
    await user.clear(box())
    await user.type(box(), 'second{Enter}')
    expect(await screen.findByRole('button', { name: 'Second place' })).toBeInTheDocument()
    expect(search.mock.calls[0]?.[1]?.aborted).toBe(true)

    await act(async () => slow.resolve([{ label: 'First place', pin: { lat: 10.4, lng: 123.9 } }]))
    expect(screen.queryByRole('button', { name: 'First place' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Second place' })).toBeInTheDocument()
  })

  it('stops a search that is still running when the panel is closed', async () => {
    const slow = deferred<SearchHit[]>()
    const { user, search, unmount } = setup({ geocoder: { search: () => slow.promise } })
    await openMap(user)
    await user.type(box(), 'lahug{Enter}')
    const signal = search.mock.calls[0]?.[1]
    expect(signal?.aborted).toBe(false)

    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => slow.resolve(HITS))
  })
})

describe('MapPicker when the map cannot work', () => {
  it('says so, removes the map, and tells the form with a hidden field so the order can go without a pin', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'break the map')

    expect(screen.getByText(text.unavailable)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Fake map' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: text.useMyLocation })).not.toBeInTheDocument()
    expect(sent()).toEqual({ mapUnavailable: '1' })
  })

  it('keeps a pin that was already saved', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    await onMap(user, 'break the map')
    expect(sent()).toEqual({ lat: '10.32812', lng: '123.90642', mapUnavailable: '1' })
  })

  it('keeps the keyboard where the customer was, on the message', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'break the map')
    // The notice is not a permanent live region (it is empty and hidden until the map fails), so the focus is what
    // makes it heard. A permanent region next to the focus move would read the message out twice.
    expect(screen.getByText(text.unavailable)).toHaveFocus()
  })

  it('does not take the keyboard from a customer who is somewhere else', async () => {
    const { user } = setup()
    await openMap(user)
    const elsewhere = document.createElement('input')
    document.body.append(elsewhere)
    elsewhere.focus()

    // A click event does not move focus, like a tile watch that gives up while the customer types in another field.
    fireEvent.click(screen.getByRole('button', { name: 'break the map' }))
    expect(screen.getByText(text.unavailable)).toBeInTheDocument()
    expect(elsewhere).toHaveFocus()
    elsewhere.remove()
  })

  it('does not post the field while the map works', async () => {
    const { user } = setup()
    await openMap(user)
    await onMap(user, 'tap Lahug')
    expect(sent()).not.toHaveProperty('mapUnavailable')
  })
})

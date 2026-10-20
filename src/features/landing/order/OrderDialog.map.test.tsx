import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReverseGeocoder } from '@/data/geocoder'
import type { OrderRepository } from '@/data/orders'
import type { AddressHint } from '@/entities/location/match'
import { fakeGeocoder, LAHUG_HINT } from '@/test/geocoder'
import { CEBU, CEBU_CITY, deferred, fakeLocations, LAHUG } from '@/test/locations'
import { OrderDialog } from './OrderDialog'

// The order form with the real map panel. Only Leaflet itself is replaced, because jsdom cannot run it:
// the shared stand-in has buttons that report a tap, or a failure, the way the real map does.
vi.mock('./LeafletMap', async () => ({ LeafletMap: (await import('./MapPicker.fakeMap')).FakeLeafletMap }))

function setup(geocoder: ReverseGeocoder = fakeGeocoder()) {
  const repo: OrderRepository = { submit: vi.fn().mockResolvedValue({ reference: 'NM-TEST1', demo: false }) }
  const reverse = vi.spyOn(geocoder, 'reverse')
  render(<OrderDialog price={37900} onClose={vi.fn()} repository={repo} locations={fakeLocations()} geocoder={geocoder} />)
  return { repo, reverse, user: userEvent.setup() }
}

type User = ReturnType<typeof userEvent.setup>

const openMap = (user: User) => user.click(screen.getByRole('button', { name: 'Open the map' }))
const label = (name: RegExp) => screen.getByLabelText(name)

/** The card, the contact details, the landmark and the consent: everything except the place and the pin. */
async function fillRest(user: User) {
  await user.click(screen.getByRole('checkbox', { name: /google review/i }))
  await user.type(label(/full name/i), 'Juan Dela Cruz')
  await user.type(label(/mobile number/i), '0917 123 4567')
  await user.type(label(/landmark/i), 'Blue gate beside the 7-Eleven')
  await user.click(label(/i agree/i))
}

describe('OrderDialog with the real map panel', () => {
  it('has one form only, because forms cannot nest', () => {
    setup()
    expect(document.querySelectorAll('form')).toHaveLength(1)
  })

  it('asks nothing of the map service until the map is opened', async () => {
    const { reverse, user } = setup()
    expect(screen.queryByRole('button', { name: 'tap Lahug' })).not.toBeInTheDocument()
    expect(reverse).not.toHaveBeenCalled()

    await openMap(user)
    expect(await screen.findByRole('button', { name: 'tap Lahug' })).toBeInTheDocument()
    expect(reverse).not.toHaveBeenCalled()
  })

  it('asks for the pin and puts focus on the first control of the panel', async () => {
    const { repo, user } = setup()
    await fillRest(user)
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText('Pin your delivery spot on the map.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open the map' })).toHaveFocus()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('fills the lists and the street from a tap, and the order carries the pin', async () => {
    const { repo, reverse, user } = setup()
    await openMap(user)
    await user.click(await screen.findByRole('button', { name: 'tap Lahug' }))

    await waitFor(() => expect(label(/^barangay/i)).toHaveValue(LAHUG.code))
    expect(reverse).toHaveBeenCalledTimes(1)
    expect(label(/^province/i)).toHaveValue(CEBU.code)
    expect(label(/^city/i)).toHaveValue(CEBU_CITY.code)
    expect(label(/street/i)).toHaveValue('12 Salinas Drive')

    await fillRest(user)
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        province: 'Cebu',
        city: 'Cebu City',
        barangay: 'Lahug',
        street: '12 Salinas Drive',
        pin: { lat: 10.32812, lng: 123.90642 },
      }),
    )
  })

  it('takes the order without a pin when the map cannot load', async () => {
    const { repo, user } = setup()
    await openMap(user)
    await user.click(await screen.findByRole('button', { name: 'break the map' }))
    expect(await screen.findByText(/The map could not load/)).toBeInTheDocument()

    await user.type(label(/street/i), '12 Salinas Drive')
    await user.selectOptions(await screen.findByLabelText(/^province/i), 'Cebu')
    await user.selectOptions(await screen.findByLabelText(/^city/i), 'Cebu City')
    await user.selectOptions(await screen.findByLabelText(/^barangay/i), 'Lahug')
    await fillRest(user)
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(vi.mocked(repo.submit).mock.calls[0]?.[0]).not.toHaveProperty('pin')
  })

  it('does not send a complete order when Enter is pressed in the search box', async () => {
    const { repo, user } = setup()
    await openMap(user)
    await user.click(await screen.findByRole('button', { name: 'tap Lahug' }))
    await waitFor(() => expect(label(/^barangay/i)).toHaveValue(LAHUG.code))
    await fillRest(user)

    await user.type(screen.getByLabelText('Find a place'), 'Lahug{Enter}')
    expect(repo.submit).not.toHaveBeenCalled()
    expect(screen.queryByText(/NM-TEST1/)).not.toBeInTheDocument()

    // The same form does send when the order button is used, so the check above can fail.
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
  })
})

const typeInstead = (user: User) => user.click(screen.getByRole('button', { name: /type it instead/i }))

describe('OrderDialog with the real map panel when the place is typed by hand', () => {
  it('keeps the barangay the customer typed when the lookup finds the province and city but no barangay', async () => {
    // The spot is in Cebu City, but the map names no area that matches a barangay of the list.
    const { repo, user } = setup(fakeGeocoder({ reverse: async () => ({ ...LAHUG_HINT, areas: [] }) }))
    await typeInstead(user)
    await user.type(label(/^province/i), 'Cebu')
    await user.type(label(/^city/i), 'Cebu City')
    await user.type(label(/^barangay/i), 'Lahug')

    await openMap(user)
    await user.click(await screen.findByRole('button', { name: 'tap Lahug' }))
    // The street arrives with the answer, so the answer has been applied to the form.
    await waitFor(() => expect(label(/street/i)).toHaveValue('12 Salinas Drive'))
    expect(label(/^barangay/i)).toHaveValue('Lahug')

    await fillRest(user)
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug' }),
    )
  })

  it('keeps the box the customer is typing in, with its focus, when the lookup lands', async () => {
    const lookup = deferred<AddressHint>()
    const { user } = setup(fakeGeocoder({ reverse: () => lookup.promise }))
    await typeInstead(user)
    await openMap(user)
    await user.click(await screen.findByRole('button', { name: 'tap Lahug' }))

    const city = label(/^city/i)
    await user.type(city, 'Sogo')
    expect(city).toHaveFocus()

    await act(async () => lookup.resolve(LAHUG_HINT))
    await waitFor(() => expect(label(/^barangay/i)).toHaveValue('Lahug'))
    expect(label(/street/i)).toHaveValue('12 Salinas Drive')
    expect(label(/^city/i)).toBe(city)
    expect(city).toHaveFocus()
    expect(city).toHaveValue('Cebu City')

    await user.keyboard('!')
    expect(city).toHaveValue('Cebu City!')
  })
})

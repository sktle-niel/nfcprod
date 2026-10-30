import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import type { ReverseGeocoder } from '@/data/geocoder'
import type { LocationRepository } from '@/data/locations'
import { OrderError, type OrderRepository } from '@/data/orders'
import type { ResolvedPlaces } from '@/data/resolveAddress'
import type { OrderReceipt } from '@/entities/order/order'
import { fakeGeocoder } from '@/test/geocoder'
import { ALCANTARA, CEBU, CEBU_CITY, fakeLocations, ILOCOS_NORTE, LAHUG } from '@/test/locations'
import { OrderDialog } from './OrderDialog'

// The real map panel needs MapLibre, which jsdom cannot run (no WebGL). This stand-in takes the same props and keeps the same
// hidden inputs (lat, lng, mapUnavailable). Its buttons play what the customer and the map do:
// "Look up" hands `map.lookup` to the form, the way a finished address lookup does.
const map = vi.hoisted(() => ({
  lookup: {} as ResolvedPlaces,
  props: null as { locations: unknown; geocoder: unknown } | null,
}))

vi.mock('./MapPicker', async () => {
  const { useEffect, useState } = await import('react')
  type Props = { locations: unknown; geocoder?: unknown; error?: string | undefined; onResolved: (places: ResolvedPlaces) => void }

  function FakeMapPicker({ locations, geocoder, error, onResolved }: Props) {
    useEffect(() => {
      map.props = { locations, geocoder }
    }, [locations, geocoder])
    const [pin, setPin] = useState<{ lat: string; lng: string } | null>(null)
    const [broken, setBroken] = useState(false)
    return (
      <div>
        <button type="button" data-field="pin" onClick={() => setPin({ lat: '10.32800', lng: '123.90600' })}>
          Place pin
        </button>
        <button type="button" onClick={() => setPin({ lat: '0.00000', lng: '0.00000' })}>
          Place pin at sea
        </button>
        <button type="button" onClick={() => setBroken(true)}>
          Break the map
        </button>
        <button type="button" onClick={() => onResolved(map.lookup)}>
          Look up
        </button>
        {pin && (
          <>
            <input type="hidden" name="lat" value={pin.lat} />
            <input type="hidden" name="lng" value={pin.lng} />
          </>
        )}
        {broken && <input type="hidden" name="mapUnavailable" value="1" />}
        {error && <p>{error}</p>}
      </div>
    )
  }
  return { MapPicker: FakeMapPicker }
})

beforeEach(() => {
  map.lookup = {}
  map.props = null
})

function setup(repository?: OrderRepository, locations: LocationRepository = fakeLocations(), geocoder?: ReverseGeocoder) {
  const repo: OrderRepository = repository ?? {
    submit: vi.fn().mockResolvedValue({ reference: 'NM-TEST1', demo: false }),
  }
  const onClose = vi.fn()
  render(<OrderDialog price={37900} onClose={onClose} repository={repo} locations={locations} geocoder={geocoder} />)
  return { repo, onClose, user: userEvent.setup() }
}

type User = ReturnType<typeof userEvent.setup>

/** Puts the pin on the map, the way a tap does. */
const placePin = (user: User) => user.click(screen.getByRole('button', { name: 'Place pin' }))

/** The map finishes looking up an address and hands these places to the form. */
async function lookUp(user: User, places: ResolvedPlaces) {
  map.lookup = places
  await user.click(screen.getByRole('button', { name: 'Look up' }))
}

/** Waits until the list has the option, then picks it. */
async function choose(user: User, label: RegExp, option: string) {
  await screen.findByRole('option', { name: option })
  await user.selectOptions(screen.getByLabelText(label), option)
}

async function fillContact(user: User) {
  await user.type(screen.getByLabelText(/full name/i), 'Juan Dela Cruz')
  await user.type(screen.getByLabelText(/mobile number/i), '0917 123 4567')
}

async function fillAddress(user: User) {
  await user.type(screen.getByLabelText(/street/i), '12 Salinas Drive')
  await user.type(screen.getByLabelText(/landmark/i), 'Blue gate beside the 7-Eleven')
}

/** The running total under the form. The place lists have a status line of their own. */
const total = () => screen.getByText(/^Total ·/).closest('[role="status"]')

/** Everything the form needs, including the pin. Pass `false` to leave the pin out. */
async function fillDetails(user: User, withPin = true) {
  if (withPin) await placePin(user)
  await fillContact(user)
  await choose(user, /^province/i, 'Cebu')
  await choose(user, /^city/i, 'Cebu City')
  await choose(user, /^barangay/i, 'Lahug')
  await fillAddress(user)
}

describe('OrderDialog', () => {
  it('opens as a modal with the card name and price', () => {
    setup()
    expect(screen.getByRole('dialog', { name: /get your nfc card/i })).toBeInTheDocument()
    expect(screen.getByText('NFC card · ₱379 each')).toBeInTheDocument()
  })

  it('shows what is missing and sends nothing for an empty form', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/fix the highlighted fields/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true')
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('submits a complete order with the phone number normalized', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledTimes(1)
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ platform: 'google', quantity: 1 }],
        phone: '+639171234567',
        province: 'Cebu',
        city: 'Cebu City',
        barangay: 'Lahug',
        consent: true,
      }),
    )
  })

  it('asks for the place when none is chosen', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await placePin(user)
    await fillContact(user)
    await fillAddress(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/fix the highlighted fields/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^province/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/^province/i)).toHaveFocus()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('still takes the order when the lists of places cannot be loaded and the place is typed', async () => {
    const down = fakeLocations({ provinces: () => Promise.reject(new Error('down')) })
    const { repo, user } = setup(undefined, down)
    await screen.findByText(/could not load the list/i)
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await placePin(user)
    await fillContact(user)
    await user.type(screen.getByLabelText(/^province/i), 'Cebu')
    await user.type(screen.getByLabelText(/^city/i), 'Cebu City')
    await user.type(screen.getByLabelText(/^barangay/i), 'Lahug')
    await fillAddress(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(expect.objectContaining({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug' }))
  })

  it('closes with Done once the order is in', async () => {
    const { onClose, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    await user.click(await screen.findByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('adds a quantity for every chosen card and keeps the total in view', async () => {
    const { user } = setup()
    expect(total()).toHaveTextContent('Total · 0 cards₱0')
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.click(screen.getByRole('checkbox', { name: /instagram/i }))
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    expect(screen.getAllByRole('textbox', { name: /quantity/i })).toHaveLength(3)
    expect(total()).toHaveTextContent('Total · 3 cards₱1,137')

    await user.click(screen.getByRole('button', { name: /more facebook cards/i }))
    expect(screen.getByRole('textbox', { name: /facebook quantity/i })).toHaveValue('2')
    expect(screen.getByText('₱758')).toBeInTheDocument()
    expect(total()).toHaveTextContent('Total · 4 cards₱1,516')

    await user.click(screen.getByRole('checkbox', { name: /instagram/i }))
    expect(screen.getAllByRole('textbox', { name: /quantity/i })).toHaveLength(2)
  })

  it('sets every chosen card at once', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    await user.click(screen.getByRole('button', { name: 'Set all to 5' }))
    expect(screen.getByRole('textbox', { name: /facebook quantity/i })).toHaveValue('5')
    expect(screen.getByRole('textbox', { name: /google review quantity/i })).toHaveValue('5')
    expect(total()).toHaveTextContent('Total · 10 cards₱3,790')
  })

  it('replaces the number when the customer types over it', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    const field = screen.getByRole('textbox', { name: /facebook quantity/i })
    await user.click(field)
    await user.keyboard('7')
    expect(field).toHaveValue('7')
  })

  it('sends the quantity of each card', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.click(screen.getByRole('checkbox', { name: /google review/i }))
    const google = screen.getByRole('textbox', { name: /google review quantity/i })
    await user.clear(google)
    await user.type(google, '5')
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { platform: 'facebook', quantity: 1 },
          { platform: 'google', quantity: 5 },
        ],
      }),
    )
  })

  it('needs a card before sending', async () => {
    const { repo, user } = setup()
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/choose at least one card/i)).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('asks for a quantity from 1 to 20', async () => {
    const { repo, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await user.clear(screen.getByRole('textbox', { name: /facebook quantity/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/from 1 to 20/i)).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('tells the customer when the server cannot be reached', async () => {
    const repo: OrderRepository = { submit: vi.fn().mockRejectedValue(new OrderError('network')) }
    const { user } = setup(repo)
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled()
  })

  it('holds the dialog open while the order is sending, then shows the reference', async () => {
    let answer: (receipt: OrderReceipt) => void = () => {}
    const pending = new Promise<OrderReceipt>((resolve) => {
      answer = resolve
    })
    const repo: OrderRepository = { submit: vi.fn().mockReturnValue(pending) }
    const { onClose, user } = setup(repo)
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    // The dialog hears about the call one commit after the form (useModalBusy is an effect), so wait for it.
    await waitFor(() => expect(screen.getByRole('button', { name: copy.order.close })).toBeDisabled())
    expect(screen.getByRole('button', { name: copy.order.sending })).toBeDisabled()
    // jsdom has no Escape key of its own. A browser sends a keydown, then a cancel event, and both must be held back here.
    const dialog = screen.getByRole('dialog', { name: /get your nfc card/i })
    expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false)
    expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false)
    expect(onClose).not.toHaveBeenCalled()

    answer({ reference: 'NM-TEST1', demo: false })
    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
  })

  it('lets the customer close the dialog again when the order fails', async () => {
    const repo: OrderRepository = { submit: vi.fn().mockRejectedValue(new OrderError('network')) }
    const { onClose, user } = setup(repo)
    await user.click(screen.getByRole('checkbox', { name: /facebook/i }))
    await fillDetails(user)
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument()
    // The same one-commit wait as above: the dialog hears that the call ended after the form did.
    await waitFor(() => expect(screen.getByRole('button', { name: copy.order.close })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: copy.order.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('silently ignores a filled trap field', async () => {
    const { repo, user } = setup()
    await fillDetails(user)
    await user.type(document.querySelector<HTMLInputElement>('input[name="website"]')!, 'http://spam.example')
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(repo.submit).not.toHaveBeenCalled()
  })
})

/** Ticks the card, agrees, and sends. */
async function placeOrder(user: User) {
  await user.click(screen.getByLabelText(/i agree/i))
  await user.click(screen.getByRole('button', { name: /place order/i }))
}

const chooseGoogle = (user: User) => user.click(screen.getByRole('checkbox', { name: /google review/i }))
const firstOrder = (repo: OrderRepository) => vi.mocked(repo.submit).mock.calls[0]?.[0]

describe('OrderDialog with the delivery pin', () => {
  it('asks for a pin when none is placed, and puts focus on it', async () => {
    const { repo, user } = setup()
    await chooseGoogle(user)
    await fillDetails(user, false)
    await placeOrder(user)

    expect(await screen.findByText('Pin your delivery spot on the map.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place pin' })).toHaveFocus()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('looks at the pin before the place fields when both are missing', async () => {
    const { user } = setup()
    await chooseGoogle(user)
    await fillContact(user)
    await placeOrder(user)

    expect(await screen.findByText('Pin your delivery spot on the map.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^province/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Place pin' })).toHaveFocus()
  })

  it('sends the pin with the order', async () => {
    const { repo, user } = setup()
    await chooseGoogle(user)
    await fillDetails(user)
    await placeOrder(user)

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(expect.objectContaining({ pin: { lat: 10.328, lng: 123.906 } }))
  })

  it('refuses a pin that is not in the Philippines', async () => {
    const { repo, user } = setup()
    await chooseGoogle(user)
    await fillDetails(user, false)
    await user.click(screen.getByRole('button', { name: 'Place pin at sea' }))
    await placeOrder(user)

    expect(await screen.findByText('This pin is not in the Philippines. Move it to your address.')).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })

  it('takes the order without a pin when the map could not load', async () => {
    const { repo, user } = setup()
    await chooseGoogle(user)
    await fillDetails(user, false)
    await user.click(screen.getByRole('button', { name: 'Break the map' }))
    await placeOrder(user)

    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(firstOrder(repo)).toBeDefined()
    expect(firstOrder(repo)).not.toHaveProperty('pin')
  })

  it('does not let a broken map excuse a pin that is out of range', async () => {
    const { repo, user } = setup()
    await chooseGoogle(user)
    await fillDetails(user, false)
    await user.click(screen.getByRole('button', { name: 'Place pin at sea' }))
    await user.click(screen.getByRole('button', { name: 'Break the map' }))
    await placeOrder(user)

    expect(await screen.findByText('This pin is not in the Philippines. Move it to your address.')).toBeInTheDocument()
    expect(repo.submit).not.toHaveBeenCalled()
  })
})

describe('OrderDialog when the map finds the address', () => {
  const street = () => screen.getByLabelText(/street/i)
  const LAHUG_PLACES: ResolvedPlaces = { province: CEBU, city: CEBU_CITY, barangay: LAHUG, street: '12 Salinas Drive' }

  it('hands the place lists and the geocoder to the map panel', () => {
    const locations = fakeLocations()
    const geocoder = fakeGeocoder()
    setup(undefined, locations, geocoder)
    expect(map.props?.locations).toBe(locations)
    expect(map.props?.geocoder).toBe(geocoder)
  })

  it('fills the three lists and the street, and the order carries them with the pin', async () => {
    const { repo, user } = setup()
    await chooseGoogle(user)
    await placePin(user)
    await lookUp(user, LAHUG_PLACES)

    await waitFor(() => expect(screen.getByLabelText(/^barangay/i)).toHaveValue(LAHUG.code))
    expect(screen.getByLabelText(/^province/i)).toHaveValue(CEBU.code)
    expect(screen.getByLabelText(/^city/i)).toHaveValue(CEBU_CITY.code)
    expect(street()).toHaveValue('12 Salinas Drive')

    await fillContact(user)
    await user.type(screen.getByLabelText(/landmark/i), 'Blue gate beside the 7-Eleven')
    await placeOrder(user)
    expect(await screen.findByText(/NM-TEST1/)).toBeInTheDocument()
    expect(repo.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        province: 'Cebu',
        city: 'Cebu City',
        barangay: 'Lahug',
        street: '12 Salinas Drive',
        pin: { lat: 10.328, lng: 123.906 },
      }),
    )
  })

  it('fills only the levels it found and clears the ones below a province that changed', async () => {
    const { user } = setup()
    await placePin(user)
    await lookUp(user, LAHUG_PLACES)
    await waitFor(() => expect(screen.getByLabelText(/^barangay/i)).toHaveValue(LAHUG.code))

    await lookUp(user, { province: ILOCOS_NORTE })
    await waitFor(() => expect(screen.getByLabelText(/^province/i)).toHaveValue(ILOCOS_NORTE.code))
    expect(screen.getByLabelText(/^city/i)).toHaveValue('')
    expect(screen.getByLabelText(/^barangay/i)).toHaveValue('')
  })

  it('leaves the lists alone when the lookup found nothing', async () => {
    const { user } = setup()
    await choose(user, /^province/i, 'Cebu')
    await choose(user, /^city/i, 'Alcantara')

    await lookUp(user, {})
    expect(screen.getByLabelText(/^province/i)).toHaveValue(CEBU.code)
    expect(screen.getByLabelText(/^city/i)).toHaveValue(ALCANTARA.code)
  })

  it('never replaces a street the customer typed, but still fills the lists', async () => {
    const { user } = setup()
    await user.type(street(), '99 My Street')
    await lookUp(user, LAHUG_PLACES)

    await waitFor(() => expect(screen.getByLabelText(/^barangay/i)).toHaveValue(LAHUG.code))
    expect(street()).toHaveValue('99 My Street')
  })

  it('fills the street again when the customer emptied it', async () => {
    const { user } = setup()
    await user.type(street(), '99 My Street')
    await user.clear(street())
    await lookUp(user, LAHUG_PLACES)
    expect(street()).toHaveValue('12 Salinas Drive')
  })

  it('swaps its own street suggestion for the next one until the customer edits it', async () => {
    const { user } = setup()
    await lookUp(user, { street: '12 Salinas Drive' })
    await lookUp(user, { street: '14 Osmena Boulevard' })
    expect(street()).toHaveValue('14 Osmena Boulevard')

    await user.type(street(), '{Backspace}')
    await lookUp(user, { street: '16 Other Road' })
    expect(street()).toHaveValue('14 Osmena Boulevar')
  })

  it('drops its own street suggestion when the next spot has no street, but not a street the customer typed', async () => {
    const { user } = setup()
    await lookUp(user, { street: '12 Salinas Drive' })
    await lookUp(user, { province: CEBU })
    expect(street()).toHaveValue('')

    await user.type(street(), '99 My Street')
    await lookUp(user, {})
    expect(street()).toHaveValue('99 My Street')
  })
})

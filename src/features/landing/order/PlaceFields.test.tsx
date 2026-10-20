import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LocationRepository } from '@/data/locations'
import type { ResolvedPlaces } from '@/data/resolveAddress'
import type { Place } from '@/entities/location/place'
import {
  ALCANTARA,
  CEBU,
  CEBU_CITY,
  deferred,
  fakeLocations,
  ILOCOS_NORTE,
  LAHUG,
  LAOAG,
  PAMPANGA,
  POBLACION,
  SAN_FERNANDO_PAMPANGA,
} from '@/test/locations'
import { PlaceFields } from './PlaceFields'
import { usePlacePicker, type PlacePicker } from './usePlacePicker'

type Errors = Parameters<typeof PlaceFields>[0]['errors']

// The form owns the picker and hands it to the fields, so that the map beside them can fill them too.
// The form's `fill` is kept here for the tests, which call it the way the map panel does.
let fillPlaces: PlacePicker['fill']

function Form({ repository, errors }: { repository: LocationRepository; errors: Errors }) {
  const picker = usePlacePicker(repository)
  const { fill } = picker
  useEffect(() => {
    fillPlaces = fill
  }, [fill])
  return (
    <form aria-label="delivery">
      <PlaceFields picker={picker} errors={errors}>
        <input aria-label="Street" name="street" />
      </PlaceFields>
    </form>
  )
}

function setup(repository: LocationRepository = fakeLocations(), errors: Errors = {}) {
  render(<Form repository={repository} errors={errors} />)
  return userEvent.setup()
}

/** The map found these places. */
const fill = (places: ResolvedPlaces) =>
  act(async () => {
    fillPlaces(places)
  })

const province = () => screen.getByLabelText('Province')
const city = () => screen.getByLabelText(/^city/i)
const barangay = () => screen.getByLabelText('Barangay')
const optionNames = (select: HTMLElement) => within(select).getAllByRole('option').map((option) => option.textContent)
/** What the three text boxes hold. */
const boxes = () => ({
  province: (province() as HTMLInputElement).value,
  city: (city() as HTMLInputElement).value,
  barangay: (barangay() as HTMLInputElement).value,
})

type User = ReturnType<typeof userEvent.setup>

/** Waits until the list has the option, then picks it. */
async function pick(user: User, select: () => HTMLElement, name: string) {
  await screen.findByRole('option', { name })
  await user.selectOptions(select(), name)
}

/** What the form would send. */
const sent = () => Object.fromEntries(new FormData(screen.getByRole('form')) as unknown as Iterable<[string, string]>)

describe('PlaceFields with the lists', () => {
  it('fills the province list and makes the others wait for their parent', async () => {
    setup()
    await screen.findByRole('option', { name: 'Ilocos Norte' })
    expect(optionNames(province())).toEqual(['Choose province', 'Cebu', 'Ilocos Norte', 'Metro Manila'])
    expect(city()).toBeDisabled()
    expect(optionNames(city())).toEqual(['Choose a province first'])
    expect(barangay()).toBeDisabled()
    expect(optionNames(barangay())).toEqual(['Choose a city or municipality first'])
  })

  it('shows a loading state until the province list arrives', async () => {
    const provinces = deferred<Place[]>()
    setup(fakeLocations({ provinces: () => provinces.promise }))
    expect(province()).toBeDisabled()
    expect(province()).toHaveAttribute('aria-busy', 'true')
    expect(optionNames(province())).toEqual(['Loading'])

    await act(async () => provinces.resolve([CEBU]))
    expect(province()).toBeEnabled()
    expect(province()).not.toHaveAttribute('aria-busy')
  })

  it('loads the cities for a province and the barangays for a city, and sends the names', async () => {
    const user = setup()
    await pick(user, province, 'Cebu')
    await screen.findByRole('option', { name: 'Cebu City' })
    expect(optionNames(city())).toEqual(['Choose city or municipality', 'Alcantara', 'Cebu City'])

    await pick(user, city, 'Cebu City')
    await screen.findByRole('option', { name: 'Lahug' })
    expect(optionNames(barangay())).toEqual(['Choose barangay', 'Adlaon', 'Lahug'])

    await pick(user, barangay, 'Lahug')
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
  })

  it('reads Metro Manila like a province', async () => {
    const user = setup()
    await pick(user, province, 'Metro Manila')
    await screen.findByRole('option', { name: 'Manila City' })
    expect(sent()).toMatchObject({ province: 'Metro Manila', city: '' })
  })

  it('clears what was chosen below when a higher choice changes', async () => {
    const user = setup()
    await pick(user, province, 'Cebu')
    await pick(user, city, 'Cebu City')
    await pick(user, barangay, 'Lahug')

    await pick(user, province, 'Ilocos Norte')
    await screen.findByRole('option', { name: 'Laoag City' })
    expect(city()).toHaveValue('')
    expect(barangay()).toHaveValue('')
    expect(barangay()).toBeDisabled()
    expect(sent()).toEqual({ province: 'Ilocos Norte', city: '', barangay: '', street: '' })
  })

  it('ignores a list that arrives late for a choice that was changed since', async () => {
    const late = deferred<Place[]>()
    const user = setup(fakeLocations({ cities: async (code) => (code === CEBU.code ? late.promise : [LAOAG]) }))
    await pick(user, province, 'Cebu')
    await pick(user, province, 'Ilocos Norte')
    await screen.findByRole('option', { name: 'Laoag City' })

    await act(async () => late.resolve([CEBU_CITY, ALCANTARA]))
    expect(optionNames(city())).toEqual(['Choose city or municipality', 'Laoag City'])
  })

  it('shows the error the form gives for a field', async () => {
    setup(fakeLocations(), { city: 'This is required.' })
    await screen.findByRole('option', { name: 'Cebu' })
    expect(city()).toHaveAttribute('aria-invalid', 'true')
    expect(city()).toHaveAccessibleDescription('This is required.')
  })
})

describe('PlaceFields when the customer types', () => {
  it('turns into text boxes on request, keeps what was chosen, and goes back to the lists', async () => {
    const user = setup()
    await pick(user, province, 'Cebu')
    await screen.findByRole('option', { name: 'Cebu City' })

    await user.click(screen.getByRole('button', { name: /type it instead/i }))
    expect(province()).toHaveValue('Cebu')
    expect(city()).toHaveValue('')
    await user.type(city(), 'Sogod')
    await user.type(barangay(), 'Poblacion')
    expect(sent()).toEqual({ province: 'Cebu', city: 'Sogod', barangay: 'Poblacion', street: '' })

    await user.click(screen.getByRole('button', { name: /choose from the list/i }))
    expect(province().tagName).toBe('SELECT')
    expect(province()).toHaveValue(CEBU.code)
  })

  it('turns into text boxes when a list cannot be loaded, and can try the lists again', async () => {
    const cities = vi.fn<LocationRepository['cities']>().mockRejectedValueOnce(new Error('down')).mockResolvedValue([ALCANTARA])
    const user = setup(fakeLocations({ cities }))
    await pick(user, province, 'Cebu')

    expect(await screen.findByText(/could not load the list/i)).toBeInTheDocument()
    expect(province()).toHaveValue('Cebu')
    expect(city().tagName).toBe('INPUT')

    await user.click(screen.getByRole('button', { name: /try the list again/i }))
    await screen.findByRole('option', { name: 'Alcantara' })
    expect(city().tagName).toBe('SELECT')
    expect(province()).toHaveValue(CEBU.code)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('turns into text boxes when the province list cannot be loaded at all', async () => {
    setup(fakeLocations({ provinces: () => Promise.reject(new Error('down')) }))
    expect(await screen.findByRole('button', { name: /try the list again/i })).toBeInTheDocument()
    expect(province().tagName).toBe('INPUT')
    expect(city().tagName).toBe('INPUT')
    expect(barangay().tagName).toBe('INPUT')
  })

  it('turns into text boxes when a list comes back empty', async () => {
    const user = setup(fakeLocations({ barangays: async () => [] }))
    await pick(user, province, 'Cebu')
    await pick(user, city, 'Cebu City')
    expect(await screen.findByText(/could not load the list/i)).toBeInTheDocument()
    expect(barangay().tagName).toBe('INPUT')
  })
})

/** Chooses Cebu, Cebu City and Lahug from the lists, the way a customer does. */
async function chooseLahug(user: User) {
  await pick(user, province, 'Cebu')
  await pick(user, city, 'Cebu City')
  await pick(user, barangay, 'Lahug')
}

const LAHUG_PLACES: ResolvedPlaces = { province: CEBU, city: CEBU_CITY, barangay: LAHUG }

describe('PlaceFields when the map fills the lists', () => {
  it('sets the province, city and barangay from the places the map found', async () => {
    setup()
    await fill(LAHUG_PLACES)
    await screen.findByRole('option', { name: 'Lahug' })
    expect(province()).toHaveValue(CEBU.code)
    expect(city()).toHaveValue(CEBU_CITY.code)
    expect(barangay()).toHaveValue(LAHUG.code)
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
  })

  it('replaces what the customer chose with what the map found', async () => {
    const user = setup()
    await pick(user, province, 'Cebu')
    await pick(user, city, 'Alcantara')
    await pick(user, barangay, 'Poblacion')

    await fill(LAHUG_PLACES)
    await screen.findByRole('option', { name: 'Lahug' })
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
  })

  it('keeps the city and barangay when the map finds the same province and nothing more', async () => {
    const user = setup()
    await chooseLahug(user)

    await fill({ province: CEBU })
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
    expect(city()).toHaveValue(CEBU_CITY.code)
    expect(barangay()).toHaveValue(LAHUG.code)
  })

  it('clears the city and barangay when the map finds another province and nothing more', async () => {
    const user = setup()
    await chooseLahug(user)

    await fill({ province: ILOCOS_NORTE })
    await screen.findByRole('option', { name: 'Laoag City' })
    expect(sent()).toEqual({ province: 'Ilocos Norte', city: '', barangay: '', street: '' })
    expect(city()).toHaveValue('')
    expect(barangay()).toBeDisabled()
  })

  it('keeps the barangay when the map finds the same city without one', async () => {
    const user = setup()
    await chooseLahug(user)

    await fill({ province: CEBU, city: CEBU_CITY })
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
  })

  it('clears the barangay when the map finds another city without one', async () => {
    const user = setup()
    await chooseLahug(user)

    await fill({ province: CEBU, city: ALCANTARA })
    await screen.findByRole('option', { name: POBLACION.name })
    expect(sent()).toEqual({ province: 'Cebu', city: 'Alcantara', barangay: '', street: '' })
    expect(barangay()).toHaveValue('')
  })

  it('changes nothing when the map found no province, and ignores a city that comes without one', async () => {
    const user = setup()
    await chooseLahug(user)

    await fill({})
    await fill({ street: '12 Salinas Drive' })
    await fill({ city: ALCANTARA, barangay: POBLACION })
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
    expect(city()).toHaveValue(CEBU_CITY.code)
  })

  it('ignores a barangay that comes without its city', async () => {
    const user = setup()
    await pick(user, province, 'Cebu')

    await fill({ province: CEBU, barangay: LAHUG })
    expect(sent()).toEqual({ province: 'Cebu', city: '', barangay: '', street: '' })
  })

  it('keeps the places while the province list is still on its way', async () => {
    const provinces = deferred<Place[]>()
    setup(fakeLocations({ provinces: () => provinces.promise }))
    await fill({ province: CEBU })
    expect(province()).toBeDisabled()

    await act(async () => provinces.resolve([CEBU, ILOCOS_NORTE]))
    await screen.findByRole('option', { name: 'Cebu City' })
    expect(province()).toHaveValue(CEBU.code)
  })
})

describe('PlaceFields when the map fills the text boxes', () => {
  /** Chooses Cebu from the list, then switches to typing, so the province box starts with "Cebu". */
  async function startTyping() {
    const user = setup()
    await pick(user, province, 'Cebu')
    await user.click(screen.getByRole('button', { name: /type it instead/i }))
    return user
  }

  it('shows the names the map found', async () => {
    const user = setup()
    await screen.findByRole('option', { name: 'Cebu' })
    await user.click(screen.getByRole('button', { name: /type it instead/i }))

    await fill(LAHUG_PLACES)
    expect(province()).toHaveValue('Cebu')
    expect(city()).toHaveValue('Cebu City')
    expect(barangay()).toHaveValue('Lahug')
    expect(sent()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '' })
  })

  it('keeps what the customer typed in the levels the map did not touch', async () => {
    const user = await startTyping()
    await user.type(city(), 'Sogod')
    await user.type(barangay(), 'Poblacion')

    await fill({ province: CEBU })
    expect(city()).toHaveValue('Sogod')
    expect(barangay()).toHaveValue('Poblacion')
  })

  it('replaces what the customer typed in a level the map found', async () => {
    const user = await startTyping()
    await user.clear(province())
    await user.type(province(), 'Cebuu')
    await user.type(city(), 'Sogod')

    await fill({ province: CEBU })
    expect(province()).toHaveValue('Cebu')
    expect(city()).toHaveValue('Sogod')
  })

  it('clears what was typed below when the map finds another province', async () => {
    const user = await startTyping()
    await user.type(city(), 'Sogod')
    await user.type(barangay(), 'Poblacion')

    await fill({ province: ILOCOS_NORTE })
    expect(province()).toHaveValue('Ilocos Norte')
    expect(city()).toHaveValue('')
    expect(barangay()).toHaveValue('')
  })

  it('clears the barangay that was typed when the map finds a city without one', async () => {
    const user = await startTyping()
    await user.type(barangay(), 'Poblacion')

    await fill({ province: CEBU, city: CEBU_CITY })
    expect(city()).toHaveValue('Cebu City')
    expect(barangay()).toHaveValue('')
  })

  it('leaves the boxes alone when the map found nothing', async () => {
    const user = await startTyping()
    await user.type(city(), 'Sogod')

    await fill({})
    expect(province()).toHaveValue('Cebu')
    expect(city()).toHaveValue('Sogod')
  })

  it('hands the new names to the lists when the customer goes back to them', async () => {
    const user = await startTyping()
    await fill(LAHUG_PLACES)

    await user.click(screen.getByRole('button', { name: /choose from the list/i }))
    await screen.findByRole('option', { name: 'Lahug' })
    expect(city()).toHaveValue(CEBU_CITY.code)
    expect(barangay()).toHaveValue(LAHUG.code)
  })

  it('shows what the map set in the lists when the customer then switches to typing', async () => {
    const user = setup()
    await screen.findByRole('option', { name: 'Cebu' })
    await fill(LAHUG_PLACES)

    await user.click(screen.getByRole('button', { name: /type it instead/i }))
    expect(boxes()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug' })
  })
})

describe('PlaceFields when the customer typed the whole place by hand', () => {
  /** Switches to typing before anything is chosen, so nothing is known except what is in the boxes. */
  async function typeByHand(names: { province: string; city: string; barangay: string }) {
    const user = setup()
    await screen.findByRole('option', { name: 'Cebu' })
    await user.click(screen.getByRole('button', { name: /type it instead/i }))
    await user.type(province(), names.province)
    await user.type(city(), names.city)
    await user.type(barangay(), names.barangay)
    return user
  }

  it('keeps the city and barangay when the map finds only the province that was typed', async () => {
    await typeByHand({ province: 'Cebu', city: 'Sogod', barangay: 'Poblacion' })

    await fill({ province: CEBU })
    expect(boxes()).toEqual({ province: 'Cebu', city: 'Sogod', barangay: 'Poblacion' })
  })

  it('keeps the barangay when the map finds the province and city that were typed, but no barangay', async () => {
    await typeByHand({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug' })

    await fill({ province: CEBU, city: CEBU_CITY })
    expect(boxes()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: 'Lahug' })
  })

  it('clears the city and barangay when the map finds another province than the one typed', async () => {
    await typeByHand({ province: 'Iloilo', city: 'Ajuy', barangay: 'Poblacion' })

    await fill({ province: CEBU })
    expect(boxes()).toEqual({ province: 'Cebu', city: '', barangay: '' })
  })

  it('writes the official spelling of a place that was typed another way, and keeps what is below it', async () => {
    await typeByHand({ province: 'cebu', city: 'Sogod', barangay: 'Poblacion' })

    await fill({ province: CEBU })
    expect(boxes()).toEqual({ province: 'Cebu', city: 'Sogod', barangay: 'Poblacion' })
  })

  // Two places can share a name: there is a San Fernando City in La Union and another in Pampanga. A city that matches what
  // was typed proves nothing about the barangay typed beside it once the province above it turned out to be another one.
  it('clears what was typed below a city the map confirmed when the province above it was typed differently', async () => {
    await typeByHand({ province: 'La Union', city: 'San Fernando City', barangay: 'Catbangen' })

    await fill({ province: PAMPANGA, city: SAN_FERNANDO_PAMPANGA })
    expect(boxes()).toEqual({ province: 'Pampanga', city: 'San Fernando City', barangay: '' })
  })

  // A place the map set is compared by its code. The box below may still hold what the map set for the old place, and
  // the code cannot tell that from something typed for the new one, so what is below is cleared.
  it('clears what is below a level the map changed, also when the customer already typed the new name over the old place', async () => {
    const user = setup()
    await screen.findByRole('option', { name: 'Cebu' })
    await user.click(screen.getByRole('button', { name: /type it instead/i }))
    await fill({ province: CEBU, city: ALCANTARA, barangay: POBLACION })

    await user.clear(city())
    await user.type(city(), 'Cebu City')
    await user.clear(barangay())
    await user.type(barangay(), 'Lahug')

    await fill({ province: CEBU, city: CEBU_CITY })
    expect(boxes()).toEqual({ province: 'Cebu', city: 'Cebu City', barangay: '' })
  })
})

describe('PlaceFields when the map fills a box the customer is in', () => {
  /** Switches to typing, so every box starts empty. */
  async function startEmpty() {
    const user = setup()
    await screen.findByRole('option', { name: 'Cebu' })
    await user.click(screen.getByRole('button', { name: /type it instead/i }))
    return user
  }

  it('keeps the same box, its focus and the next keystroke when the map rewrites its level', async () => {
    const user = await startEmpty()
    const box = city()
    await user.type(box, 'Sogo')
    expect(box).toHaveFocus()

    await fill(LAHUG_PLACES)
    expect(city()).toBe(box)
    expect(box).toHaveFocus()
    expect(box).toHaveValue('Cebu City')

    await user.keyboard('!')
    expect(box).toHaveValue('Cebu City!')
  })

  it('keeps the same box, its focus and its text when the map finds the same place again', async () => {
    const user = await startEmpty()
    await fill(LAHUG_PLACES)
    const box = barangay()
    await user.click(box)
    expect(box).toHaveFocus()

    await fill(LAHUG_PLACES)
    expect(barangay()).toBe(box)
    expect(box).toHaveFocus()

    await user.keyboard(' 2')
    expect(box).toHaveValue('Lahug 2')
  })

  it('keeps the same box and what is typed in it when the map found other levels only', async () => {
    const user = await startEmpty()
    await user.type(province(), 'Cebu')
    await user.type(city(), 'Sogod')
    const box = barangay()
    await user.type(box, 'Pobl')

    await fill({ province: CEBU })
    expect(barangay()).toBe(box)
    expect(box).toHaveFocus()

    await user.keyboard('acion')
    expect(box).toHaveValue('Poblacion')
  })

  it('clears and rewrites levels in the boxes they already have', async () => {
    const user = await startEmpty()
    await fill(LAHUG_PLACES)
    const [provinceBox, cityBox, barangayBox] = [province(), city(), barangay()]
    await user.click(barangayBox)

    await fill({ province: ILOCOS_NORTE, city: LAOAG })
    expect(province()).toBe(provinceBox)
    expect(city()).toBe(cityBox)
    expect(barangay()).toBe(barangayBox)
    expect(boxes()).toEqual({ province: 'Ilocos Norte', city: 'Laoag City', barangay: '' })
    expect(barangayBox).toHaveFocus()
  })
})

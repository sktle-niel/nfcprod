import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LocationRepository } from '@/data/locations'
import type { Place } from '@/entities/location/place'
import { ALCANTARA, CEBU, CEBU_CITY, deferred, fakeLocations, LAOAG } from '@/test/locations'
import { PlaceFields } from './PlaceFields'

type Errors = Parameters<typeof PlaceFields>[0]['errors']

function setup(repository: LocationRepository = fakeLocations(), errors: Errors = {}) {
  render(
    <form aria-label="delivery">
      <PlaceFields repository={repository} errors={errors}>
        <input aria-label="Street" name="street" />
      </PlaceFields>
    </form>,
  )
  return userEvent.setup()
}

const province = () => screen.getByLabelText('Province')
const city = () => screen.getByLabelText(/^city/i)
const barangay = () => screen.getByLabelText('Barangay')
const optionNames = (select: HTMLElement) => within(select).getAllByRole('option').map((option) => option.textContent)

/** Waits until the list has the option, then picks it. */
async function pick(user: ReturnType<typeof userEvent.setup>, select: () => HTMLElement, name: string) {
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

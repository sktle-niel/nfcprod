import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { fakeGeocoder } from '@/test/geocoder'
import { fakeLocations } from '@/test/locations'
import { MapPicker } from './MapPicker'

// Whether Leaflet's code was asked for at all. The factory runs the first time './LeafletMap' is imported, by whatever
// way: a prefetch, a static import, an effect, a timer. Keep this file to the one story below, or an earlier test that
// opens the map would set the flag before the first assertion runs.
const leaflet = vi.hoisted(() => ({ asked: false }))
vi.mock('./LeafletMap', async () => {
  leaflet.asked = true
  return { LeafletMap: (await import('./MapPicker.fakeMap')).FakeLeafletMap }
})

const text = copy.order.map

describe('MapPicker and the code of the map', () => {
  it('asks for it only when "Open the map" is pressed', async () => {
    render(
      <form aria-label="order">
        <MapPicker locations={fakeLocations()} geocoder={fakeGeocoder()} onResolved={vi.fn()} />
      </form>,
    )
    // Give a prefetch from an effect, or from a resolved promise, every chance to run.
    await act(async () => {})
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(leaflet.asked).toBe(false)
    expect(screen.queryByRole('region', { name: 'Fake map' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: text.open }))
    expect(await screen.findByRole('region', { name: 'Fake map' })).toBeInTheDocument()
    expect(leaflet.asked).toBe(true)
  })
})

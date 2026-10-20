import { afterEach, describe, expect, it, vi } from 'vitest'
import { PH_BOUNDS } from '@/entities/location/pin'
import {
  configWarnings,
  geocoderUrl,
  MAP_START,
  OSM_GEOCODER,
  OSM_TILES,
  TILE_ATTRIBUTION,
  tileUrl,
  usableGeocoderUrl,
  usableTileUrl,
} from './map'

describe('usableTileUrl', () => {
  it('keeps the public OpenStreetMap tiles', () => {
    expect(usableTileUrl(OSM_TILES)).toBe(OSM_TILES)
  })

  it.each([
    'https://tiles.example.com/{z}/{x}/{y}.png',
    'https://tiles.example.com/styles/basic/{z}/{x}/{y}.png?key=abc123',
    'https://tiles.example.com/{x}/{y}/{z}',
    'https://tiles.example.com:8443/maps/{z}/{x}/{y}.webp',
    'https://tiles.example.com/{z}/{x}/{y}@2x.png',
  ])('keeps the template %s', (url) => {
    expect(usableTileUrl(url)).toBe(url)
  })

  it.each([
    ['empty text', ''],
    ['plain http', 'http://tiles.example.com/{z}/{x}/{y}.png'],
    ['a script', 'javascript:alert(1)'],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['a protocol-relative URL', '//tiles.example.com/{z}/{x}/{y}.png'],
    ['a path on this site', '/tiles/{z}/{x}/{y}.png'],
    ['no {z}', 'https://tiles.example.com/{x}/{y}.png'],
    ['no {x}', 'https://tiles.example.com/{z}/{y}.png'],
    ['no {y}', 'https://tiles.example.com/{z}/{x}.png'],
    ['a {z} twice', 'https://tiles.example.com/{z}/{z}/{x}/{y}.png'],
    ['a {y} twice', 'https://tiles.example.com/{z}/{x}/{y}/{y}.png'],
    ['a {s} subdomain, which Leaflet would fill in', 'https://{s}.tiles.example.com/{z}/{x}/{y}.png'],
    ['a {r} retina marker', 'https://tiles.example.com/{z}/{x}/{y}{r}.png'],
    ['spaces', 'https://tiles.example.com/{z}/{x}/{y}.png .evil'],
    ['a line break', 'https://tiles.example.com/{z}/{x}/{y}.png\nhttps://evil.example'],
    ['a user name in front of the host', 'https://user@evil.example/{z}/{x}/{y}.png'],
    // Built from pieces so that no secret scanner mistakes this test value for a real connection string.
    ['a user name and password in front of the host', ['https://user', 'pw@evil.example/{z}/{x}/{y}.png'].join(':')],
    ['a template that is not a URL at all', 'https://{z}/{x}/{y}'],
    ['a different spelling of the names', 'https://tiles.example.com/{Z}/{X}/{Y}.png'],
  ])('falls back to the public tiles for %s', (_, url) => {
    expect(usableTileUrl(url)).toBe(OSM_TILES)
  })
})

describe('usableGeocoderUrl', () => {
  it('keeps the public Nominatim address', () => {
    expect(usableGeocoderUrl(OSM_GEOCODER)).toBe(OSM_GEOCODER)
  })

  it.each([
    ['https://geo.example.com', 'https://geo.example.com'],
    ['https://geo.example.com/', 'https://geo.example.com'],
    ['https://geo.example.com///', 'https://geo.example.com'],
    ['https://geo.example.com/nominatim', 'https://geo.example.com/nominatim'],
    ['https://geo.example.com:8443/nominatim/', 'https://geo.example.com:8443/nominatim'],
    ['http://localhost:8080', 'http://localhost:8080'],
    ['http://localhost/', 'http://localhost'],
  ])('keeps %s as %s, with no slash at the end', (url, expected) => {
    expect(usableGeocoderUrl(url)).toBe(expected)
  })

  it.each([
    ['empty text', ''],
    ['plain http', 'http://geo.example.com'],
    ['http on a host that only starts like localhost', 'http://localhost.evil.example'],
    ['http on a different local name', 'http://127.0.0.1:8080'],
    ['a script', 'javascript:alert(1)'],
    ['a path on this site', '/geocode'],
    ['a protocol-relative URL', '//geo.example.com'],
    ['spaces', 'https://geo.example.com /x'],
    ['a line break', 'https://geo.example.com\nhttps://evil.example'],
    ['a user name in front of the host', 'https://user@evil.example'],
  ])('falls back to the public Nominatim for %s', (_, url) => {
    expect(usableGeocoderUrl(url)).toBe(OSM_GEOCODER)
  })
})

describe('configWarnings', () => {
  const TILES_NOTE = /^VITE_MAP_TILES is ignored/
  const GEOCODER_NOTE = /^VITE_GEOCODER_API is ignored/

  it('has nothing to say when nothing is set', () => {
    expect(configWarnings({ mapTiles: '', geocoderApi: '' })).toEqual([])
  })

  it('has nothing to say about addresses that are used', () => {
    expect(
      configWarnings({ mapTiles: 'https://tiles.example.com/{z}/{x}/{y}.png', geocoderApi: 'https://geo.example.com/nominatim/' }),
    ).toEqual([])
    expect(configWarnings({ mapTiles: '', geocoderApi: 'http://localhost:8080' })).toEqual([])
  })

  it('has nothing to say when the public services are set by name, since those are used as asked', () => {
    expect(configWarnings({ mapTiles: OSM_TILES, geocoderApi: OSM_GEOCODER })).toEqual([])
    expect(configWarnings({ mapTiles: '', geocoderApi: `${OSM_GEOCODER}//` })).toEqual([])
  })

  it.each([
    ['a {s} subdomain, which is how most providers write theirs', 'https://{s}.tiles.example.com/{z}/{x}/{y}.png'],
    ['a {r} retina marker', 'https://tiles.example.com/{z}/{x}/{y}{r}.png'],
    ['plain http', 'http://tiles.example.com/{z}/{x}/{y}.png'],
    ['a template with no {z}', 'https://tiles.example.com/{x}/{y}.png'],
    ['text that is not an address', 'tiles'],
  ])('warns about a tile address that is refused: %s', (_, mapTiles) => {
    const warnings = configWarnings({ mapTiles, geocoderApi: '' })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(TILES_NOTE)
  })

  it.each([
    ['plain http', 'http://geo.example.com'],
    ['a local address that is not localhost', 'http://127.0.0.1:8080'],
    ['a user name in front of the host', 'https://user@geo.example.com'],
    ['text that is not an address', 'geocoder'],
  ])('warns about a geocoder address that is refused: %s', (_, geocoderApi) => {
    const warnings = configWarnings({ mapTiles: '', geocoderApi })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(GEOCODER_NOTE)
  })

  it('warns about each of the two that is refused, and only those', () => {
    const both = configWarnings({ mapTiles: 'http://tiles.example.com/{z}/{x}/{y}.png', geocoderApi: 'http://geo.example.com' })
    expect(both).toHaveLength(2)
    expect(both[0]).toMatch(TILES_NOTE)
    expect(both[1]).toMatch(GEOCODER_NOTE)
    expect(configWarnings({ mapTiles: 'https://tiles.example.com/{z}/{x}/{y}.png', geocoderApi: 'http://geo.example.com' })).toHaveLength(1)
  })

  it('never repeats the value, which may hold a key', () => {
    const mapTiles = 'http://{s}.tiles.example.com/{z}/{x}/{y}.png?key=LEAKCHECK-TILES'
    const geocoderApi = 'http://geo.example.com/LEAKCHECK-GEO'
    for (const warning of configWarnings({ mapTiles, geocoderApi })) {
      expect(warning).not.toMatch(/LEAKCHECK|example\.com/)
    }
  })
})

describe('when the app loads', () => {
  // The settings are read when the module loads, so every case loads it afresh with its own settings.
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  async function loadWith(settings: Record<string, string>) {
    vi.resetModules()
    for (const [name, value] of Object.entries(settings)) vi.stubEnv(name, value)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fresh = await import('./map')
    return { fresh, warnings: warn.mock.calls.map(([message]) => String(message)) }
  }

  it('says nothing when no address is set', async () => {
    const { warnings } = await loadWith({})
    expect(warnings).toEqual([])
  })

  it('says nothing when the addresses are used', async () => {
    const { fresh, warnings } = await loadWith({
      VITE_MAP_TILES: 'https://tiles.example.com/{z}/{x}/{y}.png',
      VITE_GEOCODER_API: 'https://geo.example.com',
    })
    expect(warnings).toEqual([])
    expect(fresh.tileUrl).toBe('https://tiles.example.com/{z}/{x}/{y}.png')
    expect(fresh.geocoderUrl).toBe('https://geo.example.com')
  })

  it('warns once, and falls back to the public services, for addresses that are refused', async () => {
    const { fresh, warnings } = await loadWith({
      VITE_MAP_TILES: 'https://{s}.tiles.example.com/{z}/{x}/{y}.png?key=LEAKCHECK-TILES',
      VITE_GEOCODER_API: 'http://geo.example.com/LEAKCHECK-GEO',
    })
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toMatch(/^VITE_MAP_TILES is ignored/)
    expect(warnings[1]).toMatch(/^VITE_GEOCODER_API is ignored/)
    expect(warnings.join(' ')).not.toMatch(/LEAKCHECK|example\.com/)
    expect(fresh.tileUrl).toBe(OSM_TILES)
    expect(fresh.geocoderUrl).toBe(OSM_GEOCODER)
  })

  it('warns about the one address that is refused, and not the other', async () => {
    const { warnings } = await loadWith({ VITE_MAP_TILES: 'https://tiles.example.com/{z}/{x}/{y}.png', VITE_GEOCODER_API: 'http://geo.example.com' })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/^VITE_GEOCODER_API is ignored/)
  })
})

describe('the settings of the app', () => {
  it('start on the public services, since no address is set while testing', () => {
    expect(tileUrl).toBe(OSM_TILES)
    expect(geocoderUrl).toBe(OSM_GEOCODER)
  })

  it('use https for the public services', () => {
    expect(OSM_TILES).toMatch(/^https:\/\//)
    expect(OSM_GEOCODER).toMatch(/^https:\/\//)
    expect(OSM_GEOCODER).not.toMatch(/\/$/)
  })

  it('give a tile template that Leaflet can fill in', () => {
    expect(usableTileUrl(OSM_TILES)).toBe(OSM_TILES)
    expect(OSM_TILES).toContain('{z}')
    expect(OSM_TILES).toContain('{x}')
    expect(OSM_TILES).toContain('{y}')
  })
})

describe('the attribution', () => {
  it('names OpenStreetMap and links to its copyright page', () => {
    expect(TILE_ATTRIBUTION).toContain('OpenStreetMap')
    expect(TILE_ATTRIBUTION).toContain('https://www.openstreetmap.org/copyright')
  })

  it('opens the link in a new tab safely', () => {
    expect(TILE_ATTRIBUTION).toContain('target="_blank"')
    expect(TILE_ATTRIBUTION).toContain('rel="noopener noreferrer"')
  })

  it('is fixed text with no script or event handler in it', () => {
    expect(TILE_ATTRIBUTION).not.toMatch(/<script|\son\w+=|javascript:/i)
  })
})

describe('the start of the map', () => {
  it('shows the whole country', () => {
    expect(MAP_START.zoom).toBeLessThanOrEqual(6)
    // Inside the box that pins are checked against, whatever its edges are.
    expect(MAP_START.lat).toBeGreaterThan(PH_BOUNDS.south)
    expect(MAP_START.lat).toBeLessThan(PH_BOUNDS.north)
    expect(MAP_START.lng).toBeGreaterThan(PH_BOUNDS.west)
    expect(MAP_START.lng).toBeLessThan(PH_BOUNDS.east)
  })
})

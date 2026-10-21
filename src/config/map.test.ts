import { afterEach, describe, expect, it, vi } from 'vitest'
import { PH_BOUNDS } from '@/entities/location/pin'
import {
  configWarnings,
  geocoderUrl,
  MAP_CREDITS,
  MAP_START,
  OPENFREEMAP_STYLE,
  OSM_GEOCODER,
  styleUrl,
  usableGeocoderUrl,
  usableStyleUrl,
} from './map'

describe('usableStyleUrl', () => {
  it('keeps the public OpenFreeMap style', () => {
    expect(usableStyleUrl(OPENFREEMAP_STYLE)).toBe(OPENFREEMAP_STYLE)
  })

  it.each([
    'https://maps.example.com/styles/light.json',
    'https://maps.example.com/styles/light/style.json?key=abc123',
    'https://maps.example.com:8443/styles/light.json',
    'https://maps.example.com',
    // An "@" in the path or the query is not a user name. Only one in front of the host is.
    'https://maps.example.com/styles/a@b/style.json?key=a@b',
    // The scheme is not case sensitive. The value is kept as it was written.
    'HTTPS://maps.example.com/styles/light.json',
  ])('keeps the address %s, as it was written', (url) => {
    expect(usableStyleUrl(url)).toBe(url)
  })

  it.each([
    ['empty text', ''],
    ['plain http', 'http://maps.example.com/styles/light.json'],
    ['another scheme', 'ftp://maps.example.com/styles/light.json'],
    ['a script', 'javascript:alert(1)'],
    ['a data URL', 'data:application/json;base64,e30='],
    ['a protocol-relative URL', '//maps.example.com/styles/light.json'],
    ['a path on this site', '/styles/light.json'],
    ['a host with no scheme', 'maps.example.com/styles/light.json'],
    ['a scheme and no host', 'https://'],
    ['a scheme and a path with no host', 'https:///styles/light.json'],
    ['a scheme and no slashes, which a browser reads against this site', 'https:maps.example.com/styles/light.json'],
    ['a port that is not a number', 'https://maps.example.com:abc/styles/light.json'],
    ['a tile template, which belongs in no style setting', 'https://tiles.example.com/{z}/{x}/{y}.png'],
    ['a brace in the query', 'https://maps.example.com/styles/light.json?key={key}'],
    ['a closing brace alone', 'https://maps.example.com/styles/light}.json'],
    ['spaces', 'https://maps.example.com/styles/light.json .evil'],
    ['a space in the host', 'https://maps .example.com/styles/light.json'],
    ['a line break', 'https://maps.example.com/styles/light.json\nhttps://evil.example'],
    ['a user name in front of the host', 'https://user@evil.example/styles/light.json'],
    // Built from pieces so that no secret scanner mistakes these test values for a real connection string.
    ['a user name and password in front of the host', ['https://user', 'pw@evil.example/styles/light.json'].join(':')],
    ['a password alone in front of the host', ['https://', 'pw@evil.example/styles/light.json'].join(':')],
    ['a real host that is hidden behind a fake port', ['https://maps.example.com', '443@evil.example/styles/light.json'].join(':')],
  ])('falls back to the OpenFreeMap style for %s', (_, url) => {
    expect(usableStyleUrl(url)).toBe(OPENFREEMAP_STYLE)
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
  const STYLE_NOTE = /^VITE_MAP_STYLE is ignored/
  const GEOCODER_NOTE = /^VITE_GEOCODER_API is ignored/

  it('has nothing to say when nothing is set', () => {
    expect(configWarnings({ mapStyle: '', geocoderApi: '' })).toEqual([])
  })

  it('has nothing to say about addresses that are used', () => {
    expect(
      configWarnings({ mapStyle: 'https://maps.example.com/styles/light.json?key=abc123', geocoderApi: 'https://geo.example.com/nominatim/' }),
    ).toEqual([])
    expect(configWarnings({ mapStyle: '', geocoderApi: 'http://localhost:8080' })).toEqual([])
  })

  it('has nothing to say when the public services are set by name, since those are used as asked', () => {
    expect(configWarnings({ mapStyle: OPENFREEMAP_STYLE, geocoderApi: OSM_GEOCODER })).toEqual([])
    expect(configWarnings({ mapStyle: '', geocoderApi: `${OSM_GEOCODER}//` })).toEqual([])
  })

  it.each([
    ['a tile template, which is what the old setting held', 'https://tiles.example.com/{z}/{x}/{y}.png'],
    ['plain http', 'http://maps.example.com/styles/light.json'],
    ['a user name in front of the host', 'https://user@maps.example.com/styles/light.json'],
    ['spaces', 'https://maps.example.com/styles/light .json'],
    ['text that is not an address', 'positron'],
  ])('warns about a style address that is refused: %s', (_, mapStyle) => {
    const warnings = configWarnings({ mapStyle, geocoderApi: '' })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(STYLE_NOTE)
  })

  it.each([
    ['plain http', 'http://geo.example.com'],
    ['a local address that is not localhost', 'http://127.0.0.1:8080'],
    ['a user name in front of the host', 'https://user@geo.example.com'],
    ['text that is not an address', 'geocoder'],
  ])('warns about a geocoder address that is refused: %s', (_, geocoderApi) => {
    const warnings = configWarnings({ mapStyle: '', geocoderApi })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(GEOCODER_NOTE)
  })

  it('warns about each of the two that is refused, and only those', () => {
    const both = configWarnings({ mapStyle: 'http://maps.example.com/styles/light.json', geocoderApi: 'http://geo.example.com' })
    expect(both).toHaveLength(2)
    expect(both[0]).toMatch(STYLE_NOTE)
    expect(both[1]).toMatch(GEOCODER_NOTE)
    expect(configWarnings({ mapStyle: 'https://maps.example.com/styles/light.json', geocoderApi: 'http://geo.example.com' })).toHaveLength(1)
  })

  it('never repeats the value, which may hold a key', () => {
    const mapStyle = 'http://maps.example.com/LEAKCHECK-STYLE/{z}.json?key=LEAKCHECK-KEY'
    const geocoderApi = 'http://geo.example.com/LEAKCHECK-GEO'
    const warnings = configWarnings({ mapStyle, geocoderApi })
    expect(warnings).toHaveLength(2)
    for (const warning of warnings) {
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
    const { fresh, warnings } = await loadWith({})
    expect(warnings).toEqual([])
    expect(fresh.styleUrl).toBe(OPENFREEMAP_STYLE)
    expect(fresh.geocoderUrl).toBe(OSM_GEOCODER)
  })

  it('reads an empty setting as not set', async () => {
    const { fresh, warnings } = await loadWith({ VITE_MAP_STYLE: '', VITE_GEOCODER_API: '' })
    expect(warnings).toEqual([])
    expect(fresh.styleUrl).toBe(OPENFREEMAP_STYLE)
    expect(fresh.geocoderUrl).toBe(OSM_GEOCODER)
  })

  it('says nothing when the addresses are used', async () => {
    const { fresh, warnings } = await loadWith({
      VITE_MAP_STYLE: 'https://maps.example.com/styles/light.json?key=abc123',
      VITE_GEOCODER_API: 'https://geo.example.com',
    })
    expect(warnings).toEqual([])
    expect(fresh.styleUrl).toBe('https://maps.example.com/styles/light.json?key=abc123')
    expect(fresh.geocoderUrl).toBe('https://geo.example.com')
  })

  it('ignores spaces around an address, which a deploy setting easily picks up', async () => {
    const { fresh, warnings } = await loadWith({ VITE_MAP_STYLE: '  https://maps.example.com/styles/light.json \n' })
    expect(warnings).toEqual([])
    expect(fresh.styleUrl).toBe('https://maps.example.com/styles/light.json')
  })

  it('warns once, and falls back to the public services, for addresses that are refused', async () => {
    const { fresh, warnings } = await loadWith({
      VITE_MAP_STYLE: 'https://tiles.example.com/{z}/{x}/{y}.png?key=LEAKCHECK-KEY',
      VITE_GEOCODER_API: 'http://geo.example.com/LEAKCHECK-GEO',
    })
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toMatch(/^VITE_MAP_STYLE is ignored/)
    expect(warnings[1]).toMatch(/^VITE_GEOCODER_API is ignored/)
    expect(warnings.join(' ')).not.toMatch(/LEAKCHECK|example\.com/)
    expect(fresh.styleUrl).toBe(OPENFREEMAP_STYLE)
    expect(fresh.geocoderUrl).toBe(OSM_GEOCODER)
  })

  it('warns about the one address that is refused, and not the other', async () => {
    const { warnings } = await loadWith({ VITE_MAP_STYLE: 'https://maps.example.com/styles/light.json', VITE_GEOCODER_API: 'http://geo.example.com' })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/^VITE_GEOCODER_API is ignored/)
  })

  it('no longer reads the old tile setting', async () => {
    const { fresh, warnings } = await loadWith({ VITE_MAP_TILES: 'https://tiles.example.com/{z}/{x}/{y}.png' })
    expect(warnings).toEqual([])
    expect(fresh.styleUrl).toBe(OPENFREEMAP_STYLE)
  })
})

describe('the settings of the app', () => {
  it('start on the public services, since no address is set while testing', () => {
    expect(styleUrl).toBe(OPENFREEMAP_STYLE)
    expect(geocoderUrl).toBe(OSM_GEOCODER)
  })

  it('use https for the public services', () => {
    expect(OPENFREEMAP_STYLE).toMatch(/^https:\/\//)
    expect(OSM_GEOCODER).toMatch(/^https:\/\//)
    expect(OSM_GEOCODER).not.toMatch(/\/$/)
  })

  it('point the map at the light OpenFreeMap style, on the origin that ARCHITECTURE.md section 7.4 allows in connect-src', () => {
    // If this origin changes, change the CSP block there too, or the map is blocked in production.
    const style = new URL(OPENFREEMAP_STYLE)
    expect(style.origin).toBe('https://tiles.openfreemap.org')
    expect(style.pathname).toBe('/styles/positron')
    expect(style.search).toBe('')
  })

  it('keep the public style as it stands, for the map to load', () => {
    expect(usableStyleUrl(OPENFREEMAP_STYLE)).toBe(OPENFREEMAP_STYLE)
  })
})

describe('the credits', () => {
  const parts = MAP_CREDITS.map((credit) => (typeof credit === 'string' ? credit : credit.text))
  const links = MAP_CREDITS.filter((credit) => typeof credit !== 'string')

  it('read the way OpenFreeMap asks, in this order', () => {
    expect(parts.join(' ')).toBe('OpenFreeMap © OpenMapTiles Data from OpenStreetMap')
  })

  it('link OpenFreeMap, OpenMapTiles and OpenStreetMap to their own pages', () => {
    expect(links).toEqual([
      { text: 'OpenFreeMap', href: 'https://openfreemap.org' },
      { text: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
      { text: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
    ])
  })

  it('link only to plain https pages', () => {
    for (const { href } of links) {
      const url = new URL(href)
      expect(url.protocol).toBe('https:')
      expect(url.username + url.password).toBe('')
    }
  })

  it('are text and addresses, never markup, so nothing in them can run', () => {
    for (const text of parts) expect(text).not.toMatch(/[<>&]|javascript:/i)
    for (const { href } of links) expect(href).not.toMatch(/\s|javascript:/i)
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

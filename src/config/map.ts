import { env } from '@/config/env'

/** The public OpenStreetMap tiles and Nominatim. Free, no key, no SLA, light use only. Swap them before real traffic. */
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_GEOCODER = 'https://nominatim.openstreetmap.org'

/** Shown on the map, bottom right, always. The tile policy requires it. The text is fixed here, never from outside. */
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

/** Where the map starts: the whole country. */
export const MAP_START = { lat: 12.8797, lng: 121.774, zoom: 5 } as const

/**
 * A tile template is used only if it has {z}, {x} and {y} once each and no other braces, and with those filled in it
 * is a plain https URL: no spaces, and no user name or password in front of the host. A path may hold an "@" ("{y}@2x.png").
 */
export function usableTileUrl(value: string): string {
  const braces = value.match(/[{}]/g)?.length ?? 0
  if (braces !== 6 || !['{z}', '{x}', '{y}'].every((part) => value.split(part).length === 2)) return OSM_TILES
  if (/\s/.test(value)) return OSM_TILES
  // The placeholders belong in the path or query. One in the host name would make a different, meaningless host.
  const hostEnd = value.indexOf('/', value.indexOf('//') + 2)
  if (hostEnd === -1 || value.indexOf('{') < hostEnd) return OSM_TILES
  try {
    const url = new URL(value.replace('{z}', '1').replace('{x}', '1').replace('{y}', '1'))
    return url.protocol === 'https:' && url.username === '' && url.password === '' ? value : OSM_TILES
  } catch {
    return OSM_TILES
  }
}

/** A geocoder base URL is used only if it is https (or local http while developing). No trailing slash. */
export function usableGeocoderUrl(value: string): string {
  const ok = /^https:\/\/[^\s@]+$/.test(value) || /^http:\/\/localhost[:/]/.test(value)
  return ok ? value.replace(/\/+$/, '') : OSM_GEOCODER
}

/**
 * One line for each setting that was filled in and then refused, so that a typo does not silently keep every visitor on
 * the public servers. The lines name the variable and never repeat its value, which may hold a key.
 */
export function configWarnings(set: { mapTiles: string; geocoderApi: string }): string[] {
  const warnings: string[] = []
  if (set.mapTiles !== '' && set.mapTiles !== OSM_TILES && usableTileUrl(set.mapTiles) === OSM_TILES) {
    warnings.push('VITE_MAP_TILES is ignored: it needs https and {z}, {x}, {y} once each, no other braces. The public OpenStreetMap tiles are used.')
  }
  if (set.geocoderApi !== '' && set.geocoderApi.replace(/\/+$/, '') !== OSM_GEOCODER && usableGeocoderUrl(set.geocoderApi) === OSM_GEOCODER) {
    warnings.push('VITE_GEOCODER_API is ignored: it needs https. The public Nominatim service is used.')
  }
  return warnings
}

export const tileUrl = usableTileUrl(env.mapTiles)
export const geocoderUrl = usableGeocoderUrl(env.geocoderApi)

// Once, when the page loads. In every build, because the owner sets these in the deploy settings and not only on a
// laptop. It only warns: a mistyped setting must never take the landing page down.
for (const warning of configWarnings(env)) console.warn(warning)

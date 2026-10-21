import { env } from '@/config/env'

/**
 * The public OpenFreeMap "positron" style: the light, grey Positron look, built on OpenMapTiles and OpenStreetMap data.
 * Free for commercial use, no key, no sign-up, no cookies, no SLA. Swap it for our own style host before real traffic.
 */
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
/** The public Nominatim service. Free, no key, no SLA, light use only (one request a second). Swap it before real traffic. */
export const OSM_GEOCODER = 'https://nominatim.openstreetmap.org'

/**
 * Shown on the map, bottom right, always. OpenFreeMap requires "© OpenMapTiles Data from OpenStreetMap" and likes to see
 * its own name in front. Plain data, never HTML: the text and the links are fixed here, and nothing from outside is
 * ever rendered as markup. The map draws this list in React, and the attribution that the style itself carries
 * (HTML from a remote file) is switched off. If the style provider changes, change this list and the privacy sentence
 * in copy.ts with it.
 */
export const MAP_CREDITS: readonly (string | { text: string; href: string })[] = [
  { text: 'OpenFreeMap', href: 'https://openfreemap.org' },
  { text: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
  'Data from',
  { text: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
]

/**
 * Where the map starts: the whole country. Zoom 5 is on the 256-px scale that the whole app speaks (OpenStreetMap's),
 * which is one more than the 512-px zoom that MapLibre counts. Only the map renderer converts between the two.
 */
export const MAP_START = { lat: 12.8797, lng: 121.774, zoom: 5 } as const

/**
 * A style address is used only if it is a plain https URL: written out as "https://" and a host, no spaces, no braces
 * (a tile template pasted into the wrong setting has them), and no user name or password in front of the host.
 * It may carry a query string, since some providers take a key there. Anything else is the public OpenFreeMap style.
 */
export function usableStyleUrl(value: string): string {
  // "https://" and then a host name, with no space or brace anywhere. "https:host" and "https:///host" would parse, but
  // to a different host than they look like, so the scheme must be followed by exactly two slashes.
  if (!/^https:\/\/[^\s/\\{}][^\s{}]*$/i.test(value)) return OPENFREEMAP_STYLE
  try {
    const { username, password } = new URL(value)
    return username === '' && password === '' ? value : OPENFREEMAP_STYLE
  } catch {
    return OPENFREEMAP_STYLE
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
export function configWarnings(set: { mapStyle: string; geocoderApi: string }): string[] {
  const warnings: string[] = []
  if (set.mapStyle !== '' && set.mapStyle !== OPENFREEMAP_STYLE && usableStyleUrl(set.mapStyle) === OPENFREEMAP_STYLE) {
    warnings.push('VITE_MAP_STYLE is ignored: it needs an https address with no spaces, no braces and no user name or password. The public OpenFreeMap style is used.')
  }
  if (set.geocoderApi !== '' && set.geocoderApi.replace(/\/+$/, '') !== OSM_GEOCODER && usableGeocoderUrl(set.geocoderApi) === OSM_GEOCODER) {
    warnings.push('VITE_GEOCODER_API is ignored: it needs https. The public Nominatim service is used.')
  }
  return warnings
}

/** The MapLibre style JSON that the map loads: the setting if it is usable, else the public OpenFreeMap style. */
export const styleUrl = usableStyleUrl(env.mapStyle)
export const geocoderUrl = usableGeocoderUrl(env.geocoderApi)

// Once, when the page loads. In every build, because the owner sets these in the deploy settings and not only on a
// laptop. It only warns: a mistyped setting must never take the landing page down.
for (const warning of configWarnings(env)) console.warn(warning)

/**
 * Every zoom number in the app is an OpenStreetMap zoom level, counted on 256-px tiles: `MAP_START.zoom`, `MIN_PIN_ZOOM`,
 * the zooms in useMapPin.ts, the `view` prop and the test fixtures. MapLibre counts 512-px tiles, so the same scale is
 * one level less there. These two functions are the only place the two scales meet: the app keeps its numbers, the
 * library gets its own, and whatever the map reports (`onZoomedIn`, the "too far" rule) is turned back first. The library
 * zooms in fractions, so a rule on its number compares with "at least", never with "equals".
 */
export const toMapZoom = (appZoom: number): number => appZoom - 1
export const toAppZoom = (mapZoom: number): number => mapZoom + 1

/** The zoom range of the map, in the app's numbers: the whole country, down to the deepest level the style still draws well. */
export const MIN_ZOOM = 5
export const MAX_ZOOM = 19

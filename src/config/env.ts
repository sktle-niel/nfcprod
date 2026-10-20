// Single place that reads build-time env. Only VITE_ values reach the browser, so never put secrets here.
export const env = {
  appName: import.meta.env['VITE_APP_NAME']?.trim() || 'NFC Menu',
  supabaseUrl: import.meta.env['VITE_SUPABASE_URL']?.trim() ?? '',
  supabaseAnonKey: import.meta.env['VITE_SUPABASE_ANON_KEY']?.trim() ?? '',
  // Where "Get now" orders are sent (https only). Empty means demo mode: nothing is sent.
  ordersEndpoint: import.meta.env['VITE_ORDERS_ENDPOINT']?.trim() ?? '',
  // Where the province, city and barangay lists come from (https only). Empty means the public PSGC API.
  locationsApi: import.meta.env['VITE_LOCATIONS_API']?.trim() ?? '',
  // Map tiles URL template with {z}, {x} and {y} once each and no other braces (https only). Empty means the public
  // OpenStreetMap tiles. A value that does not fit is ignored, with a warning in the console (src/config/map.ts).
  mapTiles: import.meta.env['VITE_MAP_TILES']?.trim() ?? '',
  // Reverse geocoder and place search base URL (https only). Empty means the public Nominatim service. A value that
  // does not fit is ignored, with a warning in the console (src/config/map.ts).
  geocoderApi: import.meta.env['VITE_GEOCODER_API']?.trim() ?? '',
} as const

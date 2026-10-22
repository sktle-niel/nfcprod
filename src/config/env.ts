// Single place that reads build-time env. Only VITE_ values reach the browser, so never put secrets here.
export const env = {
  appName: import.meta.env['VITE_APP_NAME']?.trim() || 'NFC Menu',
  supabaseUrl: import.meta.env['VITE_SUPABASE_URL']?.trim() ?? '',
  supabaseAnonKey: import.meta.env['VITE_SUPABASE_ANON_KEY']?.trim() ?? '',
  // Where "Get now" orders are sent (https only). Empty means demo mode: nothing is sent.
  ordersEndpoint: import.meta.env['VITE_ORDERS_ENDPOINT']?.trim() ?? '',
  // Where the province, city and barangay lists come from (https only). Empty means the public PSGC API.
  locationsApi: import.meta.env['VITE_LOCATIONS_API']?.trim() ?? '',
  // MapLibre style JSON URL for the delivery pin map (https only, no braces). Empty means the public OpenFreeMap
  // Positron (light) style. A value that does not fit is ignored, with a warning in the console (src/config/map.ts).
  mapStyle: import.meta.env['VITE_MAP_STYLE']?.trim() ?? '',
  // The public address of the platform (https, no path), which menu links on NFC cards and QR codes start with. Empty means
  // the address the page is open on. A value that does not fit is ignored, with a warning (src/config/publicOrigin.ts).
  publicOrigin: import.meta.env['VITE_PUBLIC_ORIGIN']?.trim() ?? '',
  // The one https address pictures are served from (no path), which img-src in the CSP names. Empty means none yet: the
  // demo keeps uploads in the page as data addresses, and an https picture is not shown or kept. A value that does not fit
  // is ignored, with a warning (src/config/pictures.ts).
  storageOrigin: import.meta.env['VITE_STORAGE_ORIGIN']?.trim() ?? '',
  // Reverse geocoder and place search base URL (https only). Empty means the public Nominatim service. A value that
  // does not fit is ignored, with a warning in the console (src/config/map.ts).
  geocoderApi: import.meta.env['VITE_GEOCODER_API']?.trim() ?? '',
} as const

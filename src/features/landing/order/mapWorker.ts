import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre reads tiles in a worker. Left to itself it starts that worker from a `blob:` URL, which a Content Security
// Policy with `worker-src 'self'` refuses, and the map stays blank. Vite emits the worker as a file of our own origin
// instead, and the library is told where it is before the first map is made: openPinMap.ts imports this module first.
setWorkerUrl(workerUrl)

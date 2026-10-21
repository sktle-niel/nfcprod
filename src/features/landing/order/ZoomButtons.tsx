import type { MapLibreMap } from 'maplibre-gl'
import { useEffect, useState } from 'react'
import { copy } from '@/config/copy'
import { MAX_ZOOM, MIN_ZOOM, toAppZoom } from './mapZoom'
import { prefersReducedMotion } from './openPinMap'
import styles from './PinMap.module.css'

type Props = { map: MapLibreMap }

/**
 * The + and - buttons, in our own words and at the 44 px tap size the rest of the form uses. Real buttons: they answer
 * to Space and Enter by themselves. At a zoom limit a button looks and reads as dimmed but keeps the focus it has, which
 * a disabled button would drop into nowhere.
 */
export function ZoomButtons({ map }: Props) {
  const [zoom, setZoom] = useState(() => toAppZoom(map.getZoom()))
  useEffect(() => {
    const watching = map.on('zoom', () => setZoom(toAppZoom(map.getZoom())))
    return () => watching.unsubscribe()
  }, [map])

  const step = (change: 1 | -1) => {
    const options = prefersReducedMotion() ? { animate: false } : {}
    if (change > 0) map.zoomIn(options)
    else map.zoomOut(options)
  }
  const { zoomInButton, zoomOutButton } = copy.order.map

  return (
    <div className={styles.zoom}>
      <button
        type="button"
        className={styles.zoomButton}
        aria-label={zoomInButton}
        title={zoomInButton}
        aria-disabled={zoom >= MAX_ZOOM}
        onClick={() => step(1)}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        className={styles.zoomButton}
        aria-label={zoomOutButton}
        title={zoomOutButton}
        aria-disabled={zoom <= MIN_ZOOM}
        onClick={() => step(-1)}
      >
        <span aria-hidden="true">−</span>
      </button>
    </div>
  )
}

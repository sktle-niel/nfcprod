import { useLook } from '../look'
import { DECOR_COMPONENTS } from './index'
import styles from './Decor.module.css'

/**
 * The line art in the corners of the menu (`decor` in the theme). It lies behind the content, is hidden from assistive
 * technology, takes no clicks, and is clipped to the menu so it can never make the page scroll sideways.
 */
export function Decor() {
  const { decor } = useLook()
  if (decor === 'none') return null
  const Art = DECOR_COMPONENTS[decor]
  return (
    <div className={styles.decor} aria-hidden="true">
      <Art />
    </div>
  )
}

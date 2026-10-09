import { formatPeso } from '@/shared/lib/money'
import { copy } from '@/config/copy'
import { demoMenu } from '../landing.data'
import styles from './PhoneMenu.module.css'

// Decorative mockup of what a customer sees after tapping the card.
export function PhoneMenu() {
  return (
    <div className={styles.phone} role="img" aria-label={copy.landing.hero.phoneLabel}>
      <div className={styles.screen} aria-hidden="true">
        <span className={styles.notch} />
        <p className={styles.name}>{demoMenu.name}</p>
        <ul className={styles.chips}>
          {demoMenu.chips.map((chip, i) => (
            <li key={chip} className={i === 0 ? styles.chipOn : styles.chip}>
              {chip}
            </li>
          ))}
        </ul>
        <ul className={styles.items}>
          {demoMenu.items.map((item) => (
            <li key={item.name} className={styles.item}>
              <span className={styles.thumb} style={{ background: item.tone }} />
              <span className={styles.text}>
                <strong>{item.name}</strong>
                <small>{item.note}</small>
              </span>
              <span className={styles.price}>{formatPeso(item.price)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

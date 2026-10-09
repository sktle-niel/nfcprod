import type { CSSProperties } from 'react'
import { copy } from '@/config/copy'
import { formatPeso } from '@/shared/lib/money'
import { bundles } from '../landing.data'
import { CheckList } from './CheckList'
import styles from './Bundles.module.css'
import { PlatformIcon } from './PlatformIcon'

const platforms = ['facebook', 'instagram', 'google'] as const

export function Bundles() {
  const { bundles: text } = copy.landing.pricing
  return (
    <div className={styles.wrap}>
      <h3 className={`${styles.title} reveal`}>{text.title}</h3>
      <p className={`${styles.body} reveal`} style={{ '--i': 1 } as CSSProperties}>
        {text.body}
      </p>
      <ul className={styles.grid}>
        {bundles.map((bundle, i) => {
          const item = text.items[bundle.id]
          return (
            <li
              key={bundle.id}
              className={`${styles.card} ${bundle.best ? styles.best : ''} reveal`}
              style={{ '--i': i + 2 } as CSSProperties}
            >
              {bundle.best && <span className={styles.flag}>{text.best}</span>}
              <h4 className={styles.name}>{item.name}</h4>
              <strong className={styles.price}>{formatPeso(bundle.price)}</strong>
              <CheckList items={item.perks} />
              <span className={styles.icons}>
                {platforms.map((p) => (
                  <PlatformIcon key={p} platform={p} className={styles.icon} />
                ))}
              </span>
              {bundle.save !== null && (
                <span className={styles.save}>
                  {text.save} {formatPeso(bundle.save)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

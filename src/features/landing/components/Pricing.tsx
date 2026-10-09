import { copy } from '@/config/copy'
import { formatPeso } from '@/shared/lib/money'
import { CTA_HREF, packagePrice } from '../landing.data'
import { Bundles } from './Bundles'
import { CheckList } from './CheckList'
import styles from './Pricing.module.css'

export function Pricing() {
  const { pricing } = copy.landing
  return (
    <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
      <h2 id="pricing-title" className={`${styles.title} reveal`}>
        {pricing.title}
      </h2>
      <Bundles />
      <article className={`${styles.card} reveal`}>
        <span className={styles.badge}>{pricing.badge}</span>
        <h3 className={styles.name}>{pricing.name}</h3>
        <div className={styles.priceBox}>
          <small>{pricing.from}</small>
          <strong>{formatPeso(packagePrice)}</strong>
        </div>
        <p className={styles.body}>{pricing.body}</p>
        <CheckList items={pricing.features} />
        <a className={styles.cta} href={CTA_HREF}>
          {pricing.cta}
        </a>
      </article>
    </section>
  )
}

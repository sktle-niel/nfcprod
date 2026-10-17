import { copy } from '@/config/copy'
import { CardOffer } from './CardOffer'
import { PackageOffer } from './PackageOffer'
import styles from './Pricing.module.css'

export function Pricing() {
  return (
    <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
      <h2 id="pricing-title" className={`${styles.title} reveal`}>
        {copy.landing.pricing.title}
      </h2>
      <div className={styles.plans}>
        <CardOffer />
        <PackageOffer />
      </div>
    </section>
  )
}

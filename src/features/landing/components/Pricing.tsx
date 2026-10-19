import { copy } from '@/config/copy'
import type { PricingRepository } from '@/data/pricing'
import { usePrices } from '../usePrices'
import { CardOffer } from './CardOffer'
import { PackageOffer } from './PackageOffer'
import styles from './Pricing.module.css'

type Props = {
  /** Where the prices come from. The admin sets them. */
  repository?: PricingRepository
}

export function Pricing({ repository }: Props) {
  const prices = usePrices(repository)
  return (
    <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
      <h2 id="pricing-title" className={`${styles.title} reveal`}>
        {copy.landing.pricing.title}
      </h2>
      <div className={styles.plans} aria-busy={prices === null || undefined}>
        <CardOffer price={prices?.card ?? null} />
        <PackageOffer billing="month" prices={prices} index={2} />
        <PackageOffer billing="year" prices={prices} index={3} />
      </div>
    </section>
  )
}

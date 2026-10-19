import { copy } from '@/config/copy'
import type { PricingRepository } from '@/data/pricing'
import { usePricing } from '../usePricing'
import { CardOffer } from './CardOffer'
import { PackageOffer } from './PackageOffer'
import styles from './Pricing.module.css'

type Props = {
  /** Where the offers come from. The admin sets them. */
  repository?: PricingRepository
}

export function Pricing({ repository }: Props) {
  const offers = usePricing(repository)
  return (
    <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
      <h2 id="pricing-title" className={`${styles.title} reveal`}>
        {copy.landing.pricing.title}
      </h2>
      <div className={styles.plans} aria-busy={offers === null || undefined}>
        <CardOffer offer={offers?.card ?? null} />
        <PackageOffer billing="month" pricing={offers} index={2} />
        <PackageOffer billing="year" pricing={offers} index={3} />
      </div>
    </section>
  )
}

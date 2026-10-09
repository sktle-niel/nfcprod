import { useSmoothScroll } from '@/shared/hooks/useSmoothScroll'
import { CardShowcase } from './components/CardShowcase'
import { Pricing } from './components/Pricing'
import { SiteFooter } from './components/SiteFooter'
import { SiteNav } from './components/SiteNav'
import { Scene } from './components/Scene'
import styles from './LandingPage.module.css'

export function LandingPage() {
  useSmoothScroll()
  return (
    <div className={styles.page}>
      <SiteNav />
      <main>
        <Scene />
        <CardShowcase />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  )
}

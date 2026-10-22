import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LoadError } from '@/shared/ui/LoadError'
import { PageHeader } from '@/shared/ui/PageHeader'
import ui from '@/shared/ui/ui.module.css'
import { useOwnedBusiness } from '../dashboardData'
import { menuLink } from '../menuLink'
import { CardsPanel } from './CardsPanel'
import { LinkPanel } from './LinkPanel'
import { NfcGuide } from './NfcGuide'
import { PublishPanel } from './PublishPanel'
import { QrPanel } from './QrPanel'
import styles from './Share.module.css'

const text = dashboardCopy.share

/** Publish the menu, find its link, and get it onto a QR code or an NFC card. */
export function SharePage() {
  const { business, account } = useOwnedBusiness()
  const url = menuLink(business.slug)
  // Retry takes the plan error away with its button, so the page title keeps the focus while the plan loads again.
  const page = useRef<HTMLDivElement>(null)

  return (
    <div ref={page} className={styles.page}>
      <title>{text.title}</title>
      <PageHeader title={text.title} />
      {/* Always there, so a screen reader hears when it starts to say the plan is loading (after Retry). */}
      <p role="status" className={ui.visuallyHidden}>
        {account.resource.status === 'loading' ? dashboardCopy.overview.planLoading : ''}
      </p>
      {account.resource.status === 'error' && (
        <LoadError message={dashboardCopy.overview.planError} retryLabel={dashboardCopy.shell.retry} onRetry={account.retry} focusTitleIn={page} />
      )}
      <div className={styles.columns}>
        <div className={styles.stack}>
          <PublishPanel />
          <LinkPanel url={url} />
        </div>
        <QrPanel url={url} slug={business.slug} />
      </div>
      <div className={styles.columns}>
        <NfcGuide url={url} />
        <CardsPanel />
      </div>
    </div>
  )
}

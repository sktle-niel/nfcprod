import { dashboardCopy } from '@/config/dashboardCopy'
import { Panel } from '@/shared/ui/Panel'
import styles from './NfcGuide.module.css'
import shared from './Share.module.css'

const text = dashboardCopy.share.nfc

function Steps({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <>
      <h3 className={styles.heading}>{title}</h3>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </>
  )
}

/** How to write the menu link to an NFC card with a free writer app. */
export function NfcGuide({ url }: { url: string }) {
  return (
    <Panel title={text.title}>
      <p className={shared.body}>{text.intro}</p>
      <p className={shared.label}>{text.linkLabel}</p>
      <code className={styles.link}>{url}</code>
      <Steps title={text.android.title} steps={text.android.steps} />
      <Steps title={text.iphone.title} steps={text.iphone.steps} />
      <h3 className={styles.heading}>{text.testTitle}</h3>
      <p className={styles.tip}>{text.test}</p>
    </Panel>
  )
}

import { dashboardCopy } from '@/config/dashboardCopy'
import styles from './StepProgress.module.css'
import { STEPS, type Step } from './useSetupWizard'

/** "Step 2 of 4" in words, and the same as a row of segments. The segments are only a picture of it. */
export function StepProgress({ step }: { step: Step }) {
  const label = dashboardCopy.setup.progress.replace('{n}', String(step)).replace('{total}', String(STEPS.length))
  return (
    <div className={styles.progress}>
      <p className={styles.label}>{label}</p>
      <div className={styles.bar} aria-hidden="true">
        {STEPS.map((number) => (
          <span key={number} className={styles.segment} data-done={number <= step} />
        ))}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Access } from '@/entities/account/subscription'
import type { Business } from '@/entities/business/business'
import { setupProgress, setupSteps, type SetupStepId } from '@/entities/business/progress'
import type { Menu } from '@/entities/menu/menu'
import { IconCheck } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import ui from '@/shared/ui/ui.module.css'
import styles from './overview.module.css'
import { PATHS } from './paths'

const text = dashboardCopy.overview.checklist

const PAGE: Record<SetupStepId, string> = {
  items: PATHS.menu,
  details: PATHS.design,
  logo: PATHS.design,
  publish: PATHS.share,
  plan: PATHS.account,
}

type Props = { business: Business; menu: Menu; access: Access }

/** The five things that get a menu ready, how many are done, and a link to where each one is done. */
export function ChecklistPanel({ business, menu, access }: Props) {
  const steps = setupSteps({ business, menu, access })
  const { done, total } = setupProgress(steps)
  const summary = text.progressText.replace('{done}', String(done)).replace('{total}', String(total))

  return (
    <Panel title={text.title}>
      <div
        role="progressbar"
        aria-label={text.progress}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={summary}
        className={styles.meter}
      >
        <span className={styles.fill} style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <p className={styles.count}>{summary}</p>
      {done === total && <p className={styles.body}>{text.allDone}</p>}
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.id}>
            <Link className={styles.step} data-done={step.done} to={PAGE[step.id]}>
              <span className={styles.mark} data-done={step.done} aria-hidden="true">
                {step.done && <IconCheck size={14} />}
              </span>
              {text.steps[step.id]}
              {' '}
              <span className={ui.visuallyHidden}>{step.done ? text.done : text.todo}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

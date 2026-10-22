import type { Ref } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Access } from '@/entities/account/subscription'
import type { MenuState } from '@/entities/business/status'
import { formatDay } from '@/shared/lib/date'
import { plural } from '@/shared/lib/plural'
import styles from './PlanStatus.module.css'

const text = dashboardCopy.account.status
const names = dashboardCopy.account.plans.names

type Tone = 'info' | 'good' | 'warn'

type Menu = { state: MenuState; published: boolean }

// After the trial or plan, only a published menu is paused and comes back with a plan. A draft needs publishing too, and
// with no menu (or while it loads) the line says only what is true for everyone.
function endedBody(pausedBody: string, { state, published }: Menu): string {
  if (state !== 'paused') return text.endedOther
  return published ? pausedBody : text.endedDraft
}

function describe(access: Access, menu: Menu): [title: string, body: string, tone: Tone] {
  switch (access.kind) {
    case 'trial':
      return [plural(access.daysLeft, text.trial), (menu.state === 'live' ? text.trialBody : text.trialBodyHidden).replace('{date}', formatDay(access.endsAt)), 'info']
    case 'active':
      return [text.active.replace('{plan}', names[access.plan]), text.activeBody.replace('{date}', formatDay(access.renewsAt)), 'good']
    case 'lapsed':
      return [text.lapsed.replace('{plan}', names[access.plan].toLowerCase()), endedBody(text.lapsedBody, menu), 'warn']
    case 'trialEnded':
      return [text.trialEnded, endedBody(text.trialEndedBody, menu), 'warn']
  }
}

type Props = {
  access: Access
  /** What the menu is doing (`menuState`): the trial line says "live" only when it is, and an ended plan is worded by it. */
  state: MenuState
  published: boolean
  /** The page moves focus to the title when a plan starts and the button that was used goes away. */
  titleRef?: Ref<HTMLHeadingElement>
}

/** One line on where the owner stands (trial, active, ended), and what it means for the menu. */
export function PlanStatus({ access, state, published, titleRef }: Props) {
  const [title, body, tone] = describe(access, { state, published })
  return (
    <section className={styles.status} data-tone={tone} aria-labelledby="plan-status">
      <h2 id="plan-status" ref={titleRef} tabIndex={-1} className={styles.title}>
        {title}
      </h2>
      <p className={styles.body}>{body}</p>
    </section>
  )
}

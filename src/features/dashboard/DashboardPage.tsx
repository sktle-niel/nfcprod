import { Link, useNavigate } from 'react-router-dom'
import { copy } from '@/config/copy'
import { accessOf, isMenuLive, type Access, type Subscription } from '@/entities/account/subscription'
import { useSession } from '@/shared/session/context'
import { Logo } from '@/shared/ui/Logo'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import styles from './DashboardPage.module.css'
import { PlanPicker } from './PlanPicker'
import { PlanStatus } from './PlanStatus'
import { useAccount, type Repositories } from './useAccount'

const text = copy.dashboard

type Props = Repositories & {
  /** "Now" in ms, for tests. */
  now?: () => number
}

/** The owner's own page: where they stand, the plan, their free cards and their menu. */
export function DashboardPage({ now = Date.now, ...repositories }: Props) {
  const { session, logOut } = useSession()
  const navigate = useNavigate()
  const account = useAccount(repositories)
  const { resource } = account
  const time = now()
  const access = resource.status === 'ready' ? accessOf(resource.value.subscription, time) : null

  return (
    <div className={styles.page}>
      <title>{text.title}</title>
      <header className={styles.top}>
        <Link to="/" aria-label={text.home}>
          <Logo className={styles.logo} />
        </Link>
        <div className={styles.topActions}>
          <ThemeToggle />
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              // Leave first, so the owner lands on the home page and not on sign-up.
              navigate('/', { replace: true })
              void logOut()
            }}
          >
            {text.logOut}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{text.title}</h1>
        {session && (
          <p className={styles.small}>{text.signedInAs.replace('{name}', session.account.name).replace('{email}', session.account.email)}</p>
        )}

        {resource.status === 'loading' && (
          <p role="status" className={styles.small}>
            {text.loading}
          </p>
        )}
        {resource.status === 'error' && (
          <p role="alert" className={styles.error}>
            {text.loadError}{' '}
            <button type="button" className={styles.link} onClick={account.retry}>
              {text.retry}
            </button>
          </p>
        )}
        {resource.status === 'ready' && access && (
          <>
            <PlanStatus access={access} />
            <div className={styles.grid}>
              <PlanPicker
                access={access}
                pricing={resource.value.pricing}
                starting={account.starting}
                failed={account.failed}
                onStart={(plan) => void account.startPlan(plan)}
              />
              <div className={styles.side}>
                <FreeCards cards={resource.value.subscription.freeCards} access={access} />
                <MenuCard live={isMenuLive(resource.value.subscription, time)} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function FreeCards({ cards, access }: { cards: Subscription['freeCards']; access: Access }) {
  const { count, sent } = cards
  const body = sent ? text.freeCards.sent : access.kind === 'active' ? text.freeCards.ready : text.freeCards.waiting
  return (
    <section className={styles.panel} aria-labelledby="free-cards">
      <h2 id="free-cards" className={styles.panelTitle}>
        {text.freeCards.title.replace('{n}', String(count))}
      </h2>
      <p className={styles.small}>{body}</p>
    </section>
  )
}

function MenuCard({ live }: { live: boolean }) {
  return (
    <section className={styles.panel} aria-labelledby="menu-site">
      <h2 id="menu-site" className={styles.panelTitle}>
        {text.menu.title}
        <span className={styles.chip} data-tone={live ? 'good' : 'warn'}>
          {live ? text.menu.live : text.menu.paused}
        </span>
      </h2>
      <p className={styles.small}>{text.menu.body}</p>
      <p className={styles.small}>{text.menu.soon}</p>
    </section>
  )
}

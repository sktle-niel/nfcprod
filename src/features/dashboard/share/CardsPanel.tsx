import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { freeCardsState } from '@/entities/account/subscription'
import { plural } from '@/shared/lib/plural'
import { buttonClass } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { useDashboardData } from '../dashboardData'
import shared from './Share.module.css'

const text = dashboardCopy.share.cards
const CARDS_WORDS = { sent: text.sent, due: text.ready, waiting: text.waiting } as const

/** The free cards that come with a plan, and the way to order more. */
export function CardsPanel() {
  const { account } = useDashboardData()
  const { resource } = account

  if (resource.status === 'loading') {
    return (
      <Panel title={text.heading}>
        {/* Not a status line: the page has one, always there, that says the plan is loading. */}
        <p className={shared.note}>
          {text.loading}
        </p>
      </Panel>
    )
  }

  const cards = resource.status === 'ready' ? resource.value.subscription : null
  return (
    <Panel title={cards ? plural(cards.freeCards.count, { one: text.titleOne, many: text.title }) : text.heading}>
      {cards && <p className={shared.body}>{CARDS_WORDS[freeCardsState(cards)]}</p>}
      <Link to="/?order=cards" className={buttonClass('secondary')}>
        {text.order}
      </Link>
    </Panel>
  )
}

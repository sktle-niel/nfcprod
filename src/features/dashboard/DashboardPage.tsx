import { useNavigate } from 'react-router-dom'
import { copy } from '@/config/copy'
import { useSession } from '@/shared/session/context'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const text = copy.dashboard
  const { session, logOut } = useSession()
  const navigate = useNavigate()

  return (
    <main className="page-center">
      <h1>{text.title}</h1>
      {session && (
        <>
          <p>{text.signedInAs.replace('{name}', session.account.name).replace('{email}', session.account.email)}</p>
          <button
            type="button"
            className={styles.logOut}
            onClick={() => {
              // Leave first, so the owner lands on the home page and not on sign-up.
              navigate('/', { replace: true })
              void logOut()
            }}
          >
            {text.logOut}
          </button>
        </>
      )}
    </main>
  )
}

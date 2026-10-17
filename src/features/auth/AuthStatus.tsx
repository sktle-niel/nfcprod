import { copy } from '@/config/copy'
import type { AuthFailure } from '@/data/auth'
import styles from './Auth.module.css'
import { failureText } from './errors'

type Props = { failure: AuthFailure | null; hasErrors: boolean }

/** One line above the button: why the last try failed, or that fields need fixing. */
export function AuthStatus({ failure, hasErrors }: Props) {
  return (
    <div className={styles.status} role="alert">
      {failure ? <p>{failureText(failure)}</p> : hasErrors && <p>{copy.auth.errors.summary}</p>}
    </div>
  )
}

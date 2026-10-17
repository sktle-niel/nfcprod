import { copy } from '@/config/copy'
import { authDemo } from '@/data/auth'
import type { AuthMode } from '@/shared/session/authLink'
import { useSession } from '@/shared/session/context'
import { Logo } from '@/shared/ui/Logo'
import { Modal } from '@/shared/ui/Modal'
import styles from './Auth.module.css'
import { GoogleButton } from './GoogleButton'
import { LogInForm } from './LogInForm'
import { SignUpForm } from './SignUpForm'
import { useAuthAction } from './useAuthAction'

type Props = { mode: AuthMode; onMode: (mode: AuthMode) => void; onClose: () => void }

/** Sign-up and log-in in one modal: Google first, then email and password. */
export function AuthDialog({ mode, onMode, onClose }: Props) {
  const text = copy.auth
  const { signUp, logIn, continueWithGoogle } = useSession()
  const action = useAuthAction()
  const screen = mode === 'signup' ? text.signUp : text.logIn
  const other: AuthMode = mode === 'signup' ? 'login' : 'signup'

  return (
    <Modal
      centered
      title={screen.title}
      subtitle={screen.body}
      closeLabel={text.close}
      onClose={onClose}
      top={
        <div className={styles.brand}>
          <Logo className={styles.logo} />
        </div>
      }
    >
      <div className={styles.content}>
        <GoogleButton disabled={action.busy} onClick={() => void action.run(continueWithGoogle)} />
        <p className={styles.or}>{text.or}</p>
        {mode === 'signup' ? (
          <SignUpForm action={action} onSubmit={signUp} />
        ) : (
          <LogInForm action={action} onSubmit={logIn} />
        )}
        <p className={styles.footer}>
          {screen.switch}{' '}
          <button
            type="button"
            className={styles.switch}
            disabled={action.busy}
            onClick={() => {
              action.clear()
              onMode(other)
            }}
          >
            {screen.switchLink}
          </button>
        </p>
        {authDemo && <p className={styles.demo}>{text.demo}</p>}
      </div>
    </Modal>
  )
}

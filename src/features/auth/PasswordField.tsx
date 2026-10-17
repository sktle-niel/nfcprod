import { useState } from 'react'
import { copy } from '@/config/copy'
import { PASSWORD_MAX } from '@/entities/account/validate'
import { Field } from '@/shared/ui/Field'
import styles from './Auth.module.css'

type Props = {
  autoComplete: 'new-password' | 'current-password'
  hint?: string | undefined
  error?: string | undefined
}

/** Password input with a Show / Hide switch, so owners can check what they typed on a phone. */
export function PasswordField({ autoComplete, hint, error }: Props) {
  const [shown, setShown] = useState(false)
  const text = copy.auth
  return (
    <Field
      name="password"
      type={shown ? 'text' : 'password'}
      exact
      label={text.fields.password.label}
      hint={hint}
      error={error}
      autoComplete={autoComplete}
      maxLength={PASSWORD_MAX}
      trailing={
        <button
          type="button"
          className={styles.reveal}
          aria-label={text.showLabel}
          aria-pressed={shown}
          onClick={() => setShown((value) => !value)}
        >
          {shown ? text.hide : text.show}
        </button>
      }
    />
  )
}

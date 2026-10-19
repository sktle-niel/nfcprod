import type { FormEvent } from 'react'
import { copy } from '@/config/copy'
import type { LogInInput } from '@/entities/account/account'
import { validateLogIn } from '@/entities/account/validate'
import { Field } from '@/shared/ui/Field'
import styles from './Auth.module.css'
import { AuthStatus } from './AuthStatus'
import { PasswordField } from './PasswordField'
import { read, useAccountErrors } from './useAccountErrors'
import type { AuthAction } from './useAuthAction'

type Props = { action: AuthAction; onSubmit: (input: LogInInput) => Promise<void> }

/** Email and password for an owner who already has an account. */
export function LogInForm({ action, onSubmit }: Props) {
  const text = copy.auth
  const { formRef, show, message, hasErrors } = useAccountErrors(['email', 'password'])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (action.busy) return
    const data = new FormData(event.currentTarget)
    const result = validateLogIn({ email: read(data, 'email'), password: read(data, 'password') })
    show(result.ok ? {} : result.errors)
    if (result.ok) void action.run(() => onSubmit(result.input))
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
      <Field
        name="email"
        type="email"
        label={text.fields.email.label}
        placeholder={text.fields.email.placeholder}
        autoComplete="email"
        maxLength={254}
        error={message('email')}
      />
      <PasswordField autoComplete="current-password" error={message('password')} />
      <AuthStatus failure={action.failure} hasErrors={hasErrors} />
      <button type="submit" className={styles.submit} disabled={action.busy}>
        {action.busy ? text.logIn.sending : text.logIn.submit}
      </button>
    </form>
  )
}

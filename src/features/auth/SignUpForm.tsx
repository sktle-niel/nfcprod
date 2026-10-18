import type { FormEvent } from 'react'
import { copy } from '@/config/copy'
import type { SignUpInput } from '@/entities/account/account'
import { validateSignUp } from '@/entities/account/validate'
import { Field } from '@/shared/ui/Field'
import styles from './Auth.module.css'
import { AuthStatus } from './AuthStatus'
import { PasswordField } from './PasswordField'
import { read, useAccountErrors } from './useAccountErrors'
import type { AuthAction } from './useAuthAction'

type Props = { action: AuthAction; onSubmit: (input: SignUpInput) => Promise<void> }

/** Name, email and password for a new owner account. */
export function SignUpForm({ action, onSubmit }: Props) {
  const text = copy.auth
  const { formRef, show, message, hasErrors } = useAccountErrors(['name', 'email', 'password'])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (action.busy) return
    const data = new FormData(event.currentTarget)
    const result = validateSignUp({ name: read(data, 'name'), email: read(data, 'email'), password: read(data, 'password') })
    show(result.ok ? {} : result.errors)
    if (result.ok) void action.run(() => onSubmit(result.input))
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
      <Field
        name="name"
        label={text.fields.name.label}
        placeholder={text.fields.name.placeholder}
        autoComplete="name"
        maxLength={80}
        error={message('name')}
      />
      <Field
        name="email"
        type="email"
        label={text.fields.email.label}
        placeholder={text.fields.email.placeholder}
        autoComplete="email"
        maxLength={254}
        error={message('email')}
      />
      <PasswordField autoComplete="new-password" hint={text.fields.password.hint} error={message('password')} />
      <AuthStatus failure={action.failure} hasErrors={hasErrors} />
      <button type="submit" className={styles.submit} disabled={action.busy}>
        {action.busy ? text.signUp.sending : text.signUp.submit}
      </button>
      <p className={styles.notice}>{text.signUp.notice}</p>
    </form>
  )
}

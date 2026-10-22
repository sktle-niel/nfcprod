import type { ComponentPropsWithRef } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

type Props = Omit<ComponentPropsWithRef<'button'>, 'className'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Work is running: the button is disabled and tells screen readers it is busy. */
  busy?: boolean
}

/** The class names of a button, so a router Link can look like one. It stays here so the look has one home. */
// eslint-disable-next-line react/only-export-components
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${styles['button']} ${styles[variant]} ${styles[size]}`
}

export function Button({ variant = 'primary', size = 'md', busy = false, type = 'button', disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClass(variant, size)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    />
  )
}

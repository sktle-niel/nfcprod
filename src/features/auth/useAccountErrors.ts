import { useRef, useState } from 'react'
import type { AccountErrors, AccountField } from '@/entities/account/validate'
import { fieldError } from './errors'

/** What the owner typed into one field of an account form. */
export function read(data: FormData, field: AccountField): string {
  return String(data.get(field) ?? '')
}

/** Field errors for an account form: shows them and puts the cursor on the first one. */
export function useAccountErrors(order: readonly AccountField[]) {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<AccountErrors>({})

  function show(next: AccountErrors) {
    setErrors(next)
    const first = order.find((field) => next[field])
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }

  function message(field: AccountField): string | undefined {
    const code = errors[field]
    return code ? fieldError(field, code) : undefined
  }

  return { formRef, show, message, hasErrors: Object.keys(errors).length > 0 }
}

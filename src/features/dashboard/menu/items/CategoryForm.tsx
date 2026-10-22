import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { validateCategoryInput } from '@/entities/menu/validate'
import { LIMITS, type Category } from '@/entities/menu/menu'
import { OwnerError } from '@/data/ownerRepository'
import { useAsyncAction } from '@/features/dashboard/useAsyncAction'
import { fieldErrorText, ownerErrorText } from '@/features/dashboard/ownerErrors'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { nameErrorText } from '../nameErrors'
import styles from './CategoryForm.module.css'

const text = dashboardCopy.items.category
const limits = { name: LIMITS.categoryName, entries: LIMITS.categories }

const nameProblem = (code: string | undefined) => nameErrorText(text.errors.name, code, limits)

type Props = {
  /** The category being renamed, or null for a new one. */
  category: Category | null
  /** Called with the saved name once the repository has taken it. */
  onSaved: (name: string) => void
  onCancel: () => void
}

/** One name box with Save and Cancel, for a new category and for renaming one. Escape cancels. */
export function CategoryForm({ category, onSaved, onCancel }: Props) {
  const { menu, actions } = useDashboardData()
  const { run, busy, error } = useAsyncAction()
  const [name, setName] = useState(category?.name ?? '')
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const checked = validateCategoryInput(
      {
        ...(category ? { id: category.id } : {}),
        name,
        visible: category?.visible ?? true,
      },
      menu.categories,
    )
    if (!checked.ok) {
      setProblem(nameProblem(checked.errors.name) ?? fieldErrorText('invalid'))
      formRef.current?.querySelector('input')?.focus()
      return
    }
    setProblem(undefined)
    const outcome = await run(() => actions.saveCategory(checked.value))
    if (outcome.ok) onSaved(checked.value.name)
    else setProblem(outcome.error instanceof OwnerError ? nameProblem(outcome.error.fields['name']) : undefined)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      // Escape ends this form and nothing else.
      event.stopPropagation()
      onCancel()
    }
  }

  const failure = error !== null && problem === undefined ? ownerErrorText(error) : null
  return (
    <form ref={formRef} className={styles.form} noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <div className={styles.field}>
        <Field
          name="name"
          label={text.nameLabel}
          maxLength={LIMITS.categoryName}
          autoComplete="off"
          value={name}
          error={problem}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className={styles.actions}>
        <Button type="submit" size="sm" busy={busy}>
          {text.save}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {text.cancel}
        </Button>
      </div>
      {failure && (
        <p role="alert" className={styles.alert}>
          {failure}
        </p>
      )}
    </form>
  )
}

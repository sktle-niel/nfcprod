import { dashboardCopy } from '@/config/dashboardCopy'
import { BUSINESS_LIMITS } from '@/entities/business/validate'
import { Field } from '@/shared/ui/Field'

const text = dashboardCopy.setup.steps.name

type Props = { name: string; error: string | undefined; onChange: (name: string) => void }

export function NameStep({ name, error, onChange }: Props) {
  return (
    <Field
      name="name"
      label={text.label}
      placeholder={text.placeholder}
      autoComplete="organization"
      maxLength={BUSINESS_LIMITS.name}
      value={name}
      error={error}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError } from '@/data/ownerRepository'
import type { BusinessType } from '@/entities/business/business'
import { BUSINESS_LIMITS, validateNewBusiness } from '@/entities/business/validate'
import { suggestSlug } from '@/entities/business/slug'
import { checkText } from '@/shared/lib/checks'
import { FROM_SETUP } from '../arrival'
import { useDashboardData } from '../dashboardData'
import { fieldErrorsOf, fieldErrorText } from '../ownerErrors'
import { useAsyncAction } from '../useAsyncAction'
import { useSlugStatus } from './useSlugStatus'

const text = dashboardCopy.setup.steps

export const STEPS = [1, 2, 3, 4] as const
export type Step = (typeof STEPS)[number]
type Field = 'name' | 'types' | 'slug'
export type Problems = Partial<Record<Field, string | undefined>>

/** The step each field is asked on. */
const STEP_OF: Record<Field, Step> = { name: 1, types: 2, slug: 3 }

/** Everything the wizard remembers, so Back never loses an answer. */
export function useSetupWizard() {
  const { actions } = useDashboardData()
  const navigate = useNavigate()
  const create = useAsyncAction()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [types, setTypes] = useState<BusinessType[]>([])
  // Null until the owner types a link: then it follows the name.
  const [typedSlug, setTypedSlug] = useState<string | null>(null)
  const [samples, setSamples] = useState(true)
  const [problems, setProblems] = useState<Problems>({})
  const slug = typedSlug ?? suggestSlug(name)
  const link = useSlugStatus(slug, step === 3, actions.checkSlug)

  function forget(field: Field) {
    setProblems((current) => ({ ...current, [field]: undefined }))
  }
  function goTo(next: Step) {
    create.clear()
    setStep(next)
  }

  /** Puts each refusal next to its field and takes the owner to the first step that has one. */
  function showRefusals(refused: Record<string, string>) {
    const fields = (Object.keys(refused) as Field[]).filter((field) => field in STEP_OF)
    if (fields.length === 0) return false
    setProblems(Object.fromEntries(fields.map((field) => [field, refused[field]])))
    goTo(Math.min(...fields.map((field) => STEP_OF[field])) as Step)
    return true
  }

  function problemOfStep(): Problems {
    if (step === 1) {
      const checked = checkText(name, { max: BUSINESS_LIMITS.name })
      if (checked.ok) return {}
      return { name: checked.error === 'required' ? text.name.required : (fieldErrorText(checked.error) ?? text.name.required) }
    }
    if (step === 2 && types.length === 0) return { types: text.types.required }
    return {}
  }

  async function submit() {
    const checked = validateNewBusiness({ name, slug, types, samples })
    if (!checked.ok) {
      showRefusals(Object.fromEntries(Object.entries(checked.errors).map(([field, code]) => [field, fieldErrorText(code) ?? ''])))
      return
    }
    const outcome = await create.run(() => actions.createBusiness(checked.value))
    if (outcome.ok) {
      navigate('/dashboard', { replace: true, state: FROM_SETUP })
      return
    }
    if (outcome.error instanceof OwnerError && outcome.error.code === 'slugTaken') {
      link.markTaken(slug)
      goTo(3)
    } else if (outcome.error instanceof OwnerError && outcome.error.code === 'invalid') {
      // Refused fields go next to their inputs. A refusal with no field (a second setup) stays a note on this step.
      showRefusals(fieldErrorsOf(outcome.error))
    }
  }

  /** Moves on when the step is valid, or says what is wrong. On the last step it creates the menu. */
  function next() {
    const found = problemOfStep()
    setProblems(found)
    if (Object.keys(found).length > 0) return
    if (step === 3 && link.state !== 'available') return
    if (step === 4) void submit()
    else goTo((step + 1) as Step)
  }

  return {
    step,
    goTo,
    back: () => goTo(Math.max(1, step - 1) as Step),
    next,
    name,
    setName: (value: string) => {
      setName(value)
      forget('name')
    },
    types,
    toggleType: (type: BusinessType, on: boolean) => {
      setTypes((current) => (on ? [...current, type] : current.filter((candidate) => candidate !== type)))
      forget('types')
    },
    slug,
    setSlug: (value: string) => {
      setTypedSlug(value)
      forget('slug')
    },
    link,
    samples,
    setSamples,
    problems,
    creating: create.busy,
    failure: create.error,
  }
}

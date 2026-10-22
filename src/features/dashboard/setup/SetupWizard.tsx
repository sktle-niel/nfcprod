import { useEffect, useRef, type ReactNode } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { Button } from '@/shared/ui/Button'
import ui from '@/shared/ui/ui.module.css'
import { LinkStep } from './LinkStep'
import { NameStep } from './NameStep'
import { ReviewStep } from './ReviewStep'
import styles from './SetupWizard.module.css'
import { StepProgress } from './StepProgress'
import { TypesStep } from './TypesStep'
import { useSetupWizard, type Step } from './useSetupWizard'

const text = dashboardCopy.setup
const WORDS = { 1: text.steps.name, 2: text.steps.types, 3: text.steps.link, 4: text.steps.review } as const satisfies Record<Step, { heading: string; hint: string }>

/** The four questions, one at a time. Every answer is kept above the steps, so Back never loses one. */
export function SetupWizard() {
  const wizard = useSetupWizard()
  const { step, problems, link } = wizard
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const shown = useRef(step)

  // A new step starts at its heading, so a screen reader reads it and the keyboard continues from there.
  useEffect(() => {
    if (shown.current === step) return
    shown.current = step
    heading.current?.focus()
  }, [step])

  // A name that is refused takes the focus, so the keyboard lands on the field and its message is read.
  useEffect(() => {
    if (problems.name) form.current?.querySelector<HTMLElement>('[data-field="name"]')?.focus()
  }, [problems])

  const body: Record<Step, ReactNode> = {
    1: <NameStep name={wizard.name} error={problems.name} onChange={wizard.setName} />,
    2: <TypesStep types={wizard.types} error={problems.types} onToggle={wizard.toggleType} />,
    3: <LinkStep slug={wizard.slug} state={link.state} refusal={problems.slug} onChange={wizard.setSlug} onRecheck={link.retry} />,
    4: (
      <ReviewStep
        name={wizard.name}
        types={wizard.types}
        slug={wizard.slug}
        samples={wizard.samples}
        failure={wizard.failure}
        onSamples={wizard.setSamples}
        onChange={wizard.goTo}
      />
    ),
  }
  const last = step === 4

  return (
    <div className={styles.wizard}>
      <StepProgress step={step} />
      <h2 ref={heading} tabIndex={-1} className={styles.heading}>
        {WORDS[step].heading}
      </h2>
      <p className={styles.hint}>{WORDS[step].hint}</p>
      <form
        ref={form}
        noValidate
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          wizard.next()
        }}
      >
        {body[step]}
        <div className={styles.actions}>
          {step > 1 && (
            <Button variant="secondary" disabled={wizard.creating} onClick={wizard.back}>
              {text.back}
            </Button>
          )}
          <Button type="submit" busy={wizard.creating} disabled={step === 3 && link.state !== 'available'}>
            {last ? text.steps.review.create : text.next}
          </Button>
        </div>
        <p role="status" className={ui.visuallyHidden}>
          {wizard.creating ? text.steps.review.creating : ''}
        </p>
      </form>
    </div>
  )
}

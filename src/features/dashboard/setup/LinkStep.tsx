import { dashboardCopy } from '@/config/dashboardCopy'
import { menuLink } from '../menuLink'
import styles from './LinkStep.module.css'
import { SlugField } from './SlugField'
import type { SlugState } from './useSlugStatus'

const text = dashboardCopy.setup.steps.link

type Props = {
  slug: string
  state: SlugState
  refusal: string | undefined
  onChange: (slug: string) => void
  onRecheck: () => void
}

export function LinkStep({ slug, state, refusal, onChange, onRecheck }: Props) {
  return (
    <div className={styles.step}>
      <SlugField slug={slug} state={state} refusal={refusal} onChange={onChange} onRecheck={onRecheck} />
      {slug !== '' && <p className={styles.preview}>{text.preview.replace('{url}', menuLink(slug))}</p>}
      <p className={styles.careful}>{text.careful}</p>
    </div>
  )
}

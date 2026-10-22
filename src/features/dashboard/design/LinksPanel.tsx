import { dashboardCopy } from '@/config/dashboardCopy'
import type { SocialLinks } from '@/entities/business/business'
import { LINK_MAX, SOCIAL_NETWORKS } from '@/entities/business/social'
import { Field } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'
import type { DraftErrors } from './validateDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.details

type Props = {
  social: SocialLinks
  errors: DraftErrors
  onChange: (network: keyof SocialLinks, value: string) => void
}

/** The four links. Whatever the owner types is checked on save, and a link without https:// gets it there. */
export function LinksPanel({ social, errors, onChange }: Props) {
  return (
    <Panel title={text.linksTitle}>
      <div className={styles.stack}>
        <p className={styles.note}>{text.linksHint}</p>
        {errors.social && (
          <p role="alert" className={styles.error}>
            {errors.social}
          </p>
        )}
        {SOCIAL_NETWORKS.map((network) => (
          <Field
            key={network}
            name={network}
            label={text[network]}
            type="text"
            inputMode="url"
            exact
            required={false}
            maxLength={LINK_MAX}
            autoComplete="off"
            value={social[network]}
            onChange={(event) => onChange(network, event.target.value)}
            error={errors[network]}
          />
        ))}
      </div>
    </Panel>
  )
}

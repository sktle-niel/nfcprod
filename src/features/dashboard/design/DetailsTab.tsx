import type { ChangeEvent } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { BUSINESS_LIMITS } from '@/entities/business/validate'
import { Field } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'
import { LinksPanel } from './LinksPanel'
import { LogoField } from './LogoField'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.details

type TextKey = 'name' | 'tagline' | 'phone' | 'address' | 'hours'

/** The first tab: the business's name, logo, contact details, hours and links. */
export function DetailsTab({ form }: { form: DesignForm }) {
  const { draft, errors } = form
  const typed = (key: TextKey) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => form.setText(key, event.target.value)

  const field = (key: TextKey) => ({ name: key, value: draft[key], onChange: typed(key), error: errors[key] })
  const count = text.taglineCount.replace('{count}', String(draft.tagline.length)).replace('{max}', String(BUSINESS_LIMITS.tagline))

  return (
    <div className={styles.stack}>
      <Panel title={text.businessTitle}>
        <div className={styles.stack}>
          <p className={styles.note}>{text.businessNote}</p>
          <Field {...field('name')} label={text.name} maxLength={BUSINESS_LIMITS.name} autoComplete="off" />
          <Field {...field('tagline')} label={text.tagline} maxLength={BUSINESS_LIMITS.tagline} required={false} hint={count} />
          <LogoField form={form} />
        </div>
      </Panel>
      <Panel title={text.contactTitle}>
        <div className={styles.stack}>
          <p className={styles.note}>{text.contactNote}</p>
          <Field {...field('phone')} label={text.phone} type="tel" inputMode="tel" maxLength={BUSINESS_LIMITS.phone} required={false} autoComplete="off" hint={text.phoneHint} />
          <Field {...field('address')} label={text.address} maxLength={BUSINESS_LIMITS.address} required={false} autoComplete="off" hint={text.addressHint} />
          <Field {...field('hours')} label={text.hours} multiline maxLength={BUSINESS_LIMITS.hours} required={false} hint={text.hoursHint} />
        </div>
      </Panel>
      <LinksPanel social={draft.social} errors={errors} onChange={form.setSocial} />
    </div>
  )
}

import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS, type Product } from '@/entities/menu/menu'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { useModalBusy } from '@/shared/ui/modalBusy'
import { SelectField } from '@/shared/ui/SelectField'
import { Switch } from '@/shared/ui/Switch'
import type { SavedProduct } from './formState'
import { PriceFields } from './PriceFields'
import { AddonChoices, PhotoField, TagChoices } from './ProductChoices'
import styles from './ProductForm.module.css'
import { useFooterHeight } from './useFooterHeight'
import { useProductForm } from './useProductForm'

const text = dashboardCopy.productEditor

type Props = {
  product: Product | null
  categoryId: string | null
  /** Called after a save, just before the dialog closes. */
  onSaved?: ((saved: SavedProduct) => void) | undefined
  /** Closes the dialog. Called after a save and by Cancel. */
  onDone: () => void
}

/** The fields of the product editor and its Save and Cancel buttons. */
export function ProductForm({ product, categoryId, onSaved, onDone }: Props) {
  const { menu } = useDashboardData()
  const formRef = useRef<HTMLFormElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const form = useProductForm({ product, categoryId, onSaved, onDone, formRef })
  useFooterHeight(footerRef)
  // The save is on its way and cannot be called back: the dialog stays until it ends, so the next edit starts from the saved item.
  useModalBusy(form.saving)
  const { state, errors, set } = form

  return (
    <form ref={formRef} className={styles.form} noValidate onSubmit={(event) => void form.submit(event)}>
      <Field
        name="name"
        label={text.name}
        placeholder={text.namePlaceholder}
        autoComplete="off"
        maxLength={LIMITS.productName}
        error={errors['name']}
        value={state.name}
        onChange={(event) => set({ name: event.target.value }, 'name')}
      />
      <div className={styles.grouped}>
        <Field
          name="description"
          label={text.description}
          hint={text.descriptionHint}
          multiline
          required={false}
          maxLength={LIMITS.description}
          error={errors['description']}
          value={state.description}
          onChange={(event) => set({ description: event.target.value }, 'description')}
        />
        <p className={styles.counter}>
          {text.counter.replace('{n}', String(state.description.length)).replace('{max}', String(LIMITS.description))}
        </p>
      </div>
      <SelectField
        name="categoryId"
        label={text.category}
        placeholder={text.categoryPlaceholder}
        value={state.categoryId}
        options={menu.categories.map((category) => ({ value: category.id, label: category.name }))}
        hint={menu.categories.length === 0 ? text.noCategories : undefined}
        error={errors['categoryId']}
        onChange={(categoryId) => set({ categoryId }, 'categoryId')}
      />
      <PriceFields form={form} />
      <TagChoices form={form} />
      <PhotoField form={form} />
      <AddonChoices form={form} />
      <Switch
        label={text.available.label}
        description={text.available.description}
        checked={state.available}
        onChange={(available) => set({ available })}
      />
      <div ref={footerRef} className={styles.footer}>
        <div role="alert" className={styles.alert}>
          {form.formError}
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" disabled={form.saving} onClick={onDone}>
            {text.cancel}
          </Button>
          <Button type="submit" busy={form.saving} disabled={form.uploading}>
            {text.save}
          </Button>
        </div>
      </div>
    </form>
  )
}

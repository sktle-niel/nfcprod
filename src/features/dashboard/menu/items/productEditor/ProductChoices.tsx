import { copy } from '@/config/copy'
import { dashboardCopy } from '@/config/dashboardCopy'
import { PRODUCT_TAGS } from '@/entities/menu/menu'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { ChipGroup, ChipToggle } from '@/shared/ui/ChipToggle'
import { ImagePicker } from '@/shared/ui/ImagePicker'
import styles from './ProductForm.module.css'
import type { ProductForm } from './useProductForm'

const text = dashboardCopy.productEditor
const tagNames = copy.menu.view.tags

/** Adds `value` to `list` or takes it out, keeping the order of the others. */
function toggled<Value>(list: readonly Value[], value: Value, on: boolean): Value[] {
  return on ? [...list.filter((item) => item !== value), value] : list.filter((item) => item !== value)
}

/** The labels (tags) of the item. */
export function TagChoices({ form }: { form: ProductForm }) {
  const { state, errors, set } = form
  return (
    <div className={styles.block} data-field="tags" tabIndex={-1}>
      <ChipGroup legend={text.tags.legend} hint={text.tags.hint}>
        {PRODUCT_TAGS.map((tag) => (
          <ChipToggle key={tag} label={tagNames[tag]} checked={state.tags.includes(tag)} onChange={(on) => set({ tags: toggled(state.tags, tag, on) }, 'tags')} />
        ))}
      </ChipGroup>
      {errors['tags'] && <p className={styles.error}>{errors['tags']}</p>}
    </div>
  )
}

/** The add-on groups the item offers, one chip per group of the menu. */
export function AddonChoices({ form }: { form: ProductForm }) {
  const { menu } = useDashboardData()
  const { state, errors, set } = form
  return (
    <div className={styles.block} data-field="groupIds" tabIndex={-1}>
      {menu.groups.length === 0 ? (
        <>
          <p className={styles.legend}>{text.addons.legend}</p>
          <p className={styles.hint}>{text.addons.none}</p>
        </>
      ) : (
        <ChipGroup legend={text.addons.legend} hint={text.addons.hint}>
          {menu.groups.map((group) => (
            <ChipToggle
              key={group.id}
              label={group.name}
              checked={state.groupIds.includes(group.id)}
              onChange={(on) => set({ groupIds: toggled(state.groupIds, group.id, on) }, 'groupIds')}
            />
          ))}
        </ChipGroup>
      )}
      {errors['groupIds'] && <p className={styles.error}>{errors['groupIds']}</p>}
    </div>
  )
}

/** The photo of the item. The picture is checked by the repository; a refusal is said next to the picker. */
export function PhotoField({ form }: { form: ProductForm }) {
  return (
    <div className={styles.block} data-field="image" tabIndex={-1}>
      <ImagePicker
        label={text.photo.label}
        value={form.state.image}
        alt={text.photo.alt}
        chooseLabel={text.photo.choose}
        replaceLabel={text.photo.replace}
        removeLabel={text.photo.remove}
        emptyLabel={text.photo.empty}
        hint={text.photo.hint}
        busy={form.uploading}
        error={form.imageError}
        onPick={(file) => void form.pickImage(file)}
        onRemove={form.removeImage}
      />
    </div>
  )
}

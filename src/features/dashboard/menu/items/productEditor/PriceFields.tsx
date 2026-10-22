import { dashboardCopy } from '@/config/dashboardCopy'
import { mergePresets } from '@/presets'
import { Field } from '@/shared/ui/Field'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { chooseMode, newRow, withPresetSizes } from './formState'
import type { ProductForm } from './useProductForm'
import { VariantRows } from './VariantRows'

const text = dashboardCopy.productEditor

/** One price or sizes: the switch between them and the fields of the one that is on. */
export function PriceFields({ form }: { form: ProductForm }) {
  const { business } = useDashboardData()
  const { state, errors, edit, set } = form
  // The sizes of the business types, offered as a quick start. A preset without sizes (a bakery) offers nothing.
  const presetSizes = mergePresets(business?.types ?? []).sizes

  return (
    <>
      <SegmentedControl
        label={text.mode.label}
        value={state.sized ? 'sizes' : 'single'}
        options={[
          { value: 'single', label: text.mode.single },
          { value: 'sizes', label: text.mode.sizes },
        ]}
        onChange={(mode) => edit((current) => chooseMode(current, mode === 'sizes'), mode === 'sizes' ? 'variants' : 'price')}
      />
      {state.sized ? (
        <VariantRows
          rows={state.sizes}
          error={errors['variants']}
          presetSizes={presetSizes}
          onEdit={(key, patch) =>
            edit((current) => ({ ...current, sizes: current.sizes.map((row) => (row.key === key ? { ...row, ...patch, fresh: false } : row)) }), 'variants')
          }
          onAdd={() => edit((current) => ({ ...current, sizes: [...current.sizes, newRow('', '', null, true)] }), 'variants')}
          onRemove={(key) => edit((current) => ({ ...current, sizes: current.sizes.filter((row) => row.key !== key) }), 'variants')}
          onPreset={() => edit((current) => withPresetSizes(current, presetSizes), 'variants')}
        />
      ) : (
        <Field
          name="price"
          label={text.price}
          placeholder={text.pricePlaceholder}
          inputMode="decimal"
          maxLength={12}
          autoComplete="off"
          hint={text.priceHint}
          error={errors['price']}
          value={state.price}
          onChange={(event) => set({ price: event.target.value }, 'price')}
        />
      )}
    </>
  )
}

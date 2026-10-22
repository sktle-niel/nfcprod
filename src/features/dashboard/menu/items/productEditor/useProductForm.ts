import { useEffect, useState, type FormEvent, type RefObject } from 'react'
import type { Product } from '@/entities/menu/menu'
import type { ProductField } from '@/entities/menu/validateProduct'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { ownerErrorText } from '@/features/dashboard/ownerErrors'
import { useAsyncAction } from '@/features/dashboard/useAsyncAction'
import { messagesOf, refusedFields } from './errors'
import { FIELD_ORDER, checkForm, initialState, type FormState, type SavedProduct } from './formState'

type Props = {
  product: Product | null
  categoryId: string | null
  onSaved?: ((saved: SavedProduct) => void) | undefined
  onDone: () => void
  /** The form element, to find a field and focus it. */
  formRef: RefObject<HTMLFormElement | null>
}

export type ProductForm = ReturnType<typeof useProductForm>

/** The state of the product form: what is typed, what is refused, and the calls to upload a picture and save. */
export function useProductForm({ product, categoryId, onSaved, onDone, formRef }: Props) {
  const { menu, actions } = useDashboardData()
  // The form starts from the product once. The menu changes under it when it is saved, and typing must not be lost.
  const [state, setState] = useState(() => initialState(product, categoryId, menu.groups))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [focusRequest, setFocusRequest] = useState<{ field: ProductField } | null>(null)
  const save = useAsyncAction()
  const upload = useAsyncAction()

  // Runs after the errors are on screen, so the field is already marked invalid and described by its message.
  useEffect(() => {
    if (!focusRequest) return
    const field = `[data-field="${focusRequest.field}"]`
    const target = formRef.current?.querySelector<HTMLElement>(`${field}[aria-invalid="true"]`) ?? formRef.current?.querySelector<HTMLElement>(field)
    target?.focus()
  }, [focusRequest, formRef])

  /** Changes the form. `clears` is the field whose refusal no longer holds now that it changed. */
  const edit = (update: (current: FormState) => FormState, clears?: ProductField) => {
    setState(update)
    if (clears) setErrors((current) => (clears in current ? Object.fromEntries(Object.entries(current).filter(([field]) => field !== clears)) : current))
  }
  const set = (patch: Partial<FormState>, clears?: ProductField) => edit((current) => ({ ...current, ...patch }), clears)

  const refuse = (messages: Record<string, string>) => {
    const shown = Object.fromEntries(FIELD_ORDER.flatMap((field) => (messages[field] ? [[field, messages[field]]] : [])))
    setErrors(shown)
    const first = FIELD_ORDER.find((field) => shown[field] !== undefined)
    if (first) setFocusRequest({ field: first })
  }

  const pickImage = async (file: File) => {
    const outcome = await upload.run(() => actions.uploadImage(file))
    if (outcome.ok) set({ image: outcome.value }, 'image')
  }

  const removeImage = () => {
    upload.clear()
    set({ image: null }, 'image')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (save.busy || upload.busy) return
    const checked = checkForm(state, menu)
    if (!checked.ok) {
      refuse(messagesOf(checked.errors))
      return
    }
    setErrors({})
    const outcome = await save.run(() => actions.saveProduct(checked.input))
    if (outcome.ok) {
      onSaved?.({ name: checked.input.name, added: state.id === null })
      onDone()
    }
    else refuse(refusedFields(outcome.error))
  }

  return {
    state,
    errors,
    edit,
    set,
    submit,
    saving: save.busy,
    uploading: upload.busy,
    imageError: upload.failed ? ownerErrorText(upload.error) : errors['image'],
    // A failure that names no field has no place beside a field: it is said above the buttons.
    formError: save.failed && Object.keys(errors).length === 0 ? ownerErrorText(save.error) : '',
    pickImage,
    removeImage,
  }
}

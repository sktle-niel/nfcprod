import { useEffect, useMemo, useRef, useState } from 'react'
import type { Business, SocialLinks } from '@/entities/business/business'
import type { Theme } from '@/entities/theme/theme'
import type { SaveState } from '@/shared/ui/SaveStatus'
import type { OwnerActions } from '../dashboardData'
import { ownerErrorText } from '../ownerErrors'
import { useAsyncAction } from '../useAsyncAction'
import { draftOf, sameDraft, type Draft } from './draft'
import { useLookActions } from './useLookActions'
import { checkDraft, DETAILS_FIELDS, refusedFields, type DraftErrors, type FieldKey } from './validateDraft'

export type TabName = 'details' | 'look'
/** Asks the page to show a tab and focus the first invalid field in it. A new object is a new request. */
export type FocusRequest = { tab: TabName }

type TextKey = 'name' | 'tagline' | 'phone' | 'address' | 'hours'

function tabOf(errors: DraftErrors): TabName {
  return DETAILS_FIELDS.some((field) => errors[field] !== undefined) ? 'details' : 'look'
}

function without(errors: DraftErrors, cleared: readonly FieldKey[]): DraftErrors {
  const rest = { ...errors }
  for (const field of cleared) delete rest[field]
  return rest
}

/**
 * The one draft of the Design page. `edits` is null until the owner changes something, so the draft is the saved business
 * until then and follows it. Save sends only what changed; a refusal puts its words next to the fields.
 */
export function useDesignDraft(business: Business, actions: Pick<OwnerActions, 'saveBusiness' | 'uploadImage'>) {
  const [edits, setEdits] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [status, setStatus] = useState<SaveState>('idle')
  const [note, setNote] = useState('')
  const [focusAt, setFocusAt] = useState<FocusRequest | null>(null)
  const { run, busy, error, clear } = useAsyncAction()
  const upload = useAsyncAction()

  const saved = useMemo(() => draftOf(business), [business])
  // The newest saved draft, for updates that run later (a finished upload) and must not start from an old render.
  const savedRef = useRef(saved)
  useEffect(() => {
    savedRef.current = saved
  }, [saved])
  const draft = edits ?? saved
  const dirty = edits !== null && !sameDraft(edits, saved)
  const notice = error !== null && Object.keys(errors).length === 0 ? ownerErrorText(error) : ''

  /** Changes the newest draft, whichever render this function comes from. */
  const apply = (update: (current: Draft) => Draft, cleared: readonly FieldKey[]) => {
    setEdits((current) => update(current ?? savedRef.current))
    setErrors((current) => without(current, cleared))
    setStatus('idle')
    setNote('')
    clear()
  }

  const change = (update: (current: Draft) => Draft, cleared: readonly FieldKey[]) => {
    // A save is in flight: what the owner types now would be lost when it ends.
    if (busy) return
    apply(update, cleared)
  }

  const theme = (update: (current: Theme) => Theme, cleared: readonly FieldKey[] = []) =>
    change((current) => ({ ...current, theme: update(current.theme) }), ['theme', ...cleared])

  const refuse = (refused: DraftErrors) => {
    setErrors(refused)
    setStatus('error')
    if (Object.keys(refused).length > 0) setFocusAt({ tab: tabOf(refused) })
  }

  const { forget, ...look } = useLookActions({ draft, business, busy, theme, setNote })

  const discard = () => {
    if (upload.busy) return
    forget()
    setEdits(null)
    setErrors({})
    setStatus('idle')
    setNote('')
    clear()
    upload.clear()
  }

  /** True when the changes are saved. */
  const save = async (): Promise<boolean> => {
    // A logo that is still uploading is not in the draft yet: saving now would drop it.
    if (busy || upload.busy) return false
    const checked = checkDraft(draft, business)
    if (!checked.ok) {
      refuse(checked.errors)
      return false
    }
    setErrors({})
    if (Object.keys(checked.patch).length > 0) {
      setStatus('saving')
      const outcome = await run(() => actions.saveBusiness(checked.patch))
      if (!outcome.ok) {
        refuse(refusedFields(outcome.error))
        return false
      }
    }
    setEdits(null)
    // The refusal of an earlier logo is about a file that is not in the draft: it must not outlive the save.
    upload.clear()
    setStatus('saved')
    return true
  }

  /** Checks and keeps a picture, then puts it in the newest draft. Nothing else waits on it: the draft stays open to typing. */
  const pickLogo = async (file: File) => {
    if (busy || upload.busy) return
    const outcome = await upload.run(() => actions.uploadImage(file))
    if (outcome.ok) apply((current) => ({ ...current, logo: outcome.value }), ['logo'])
  }

  const removeLogo = () => {
    upload.clear()
    change((current) => ({ ...current, logo: null }), ['logo'])
  }

  return {
    draft,
    dirty,
    errors,
    status,
    notice,
    note,
    busy,
    uploading: upload.busy,
    logoError: upload.failed ? ownerErrorText(upload.error) : undefined,
    focusAt,
    setText: (key: TextKey, value: string) => change((current) => ({ ...current, [key]: value }), [key]),
    setSocial: (network: keyof SocialLinks, value: string) =>
      change((current) => ({ ...current, social: { ...current.social, [network]: value } }), [network, 'social']),
    pickLogo,
    removeLogo,
    ...look,
    discard,
    save,
  }
}

/** What the tabs get: the draft and everything that changes it. */
export type DesignForm = ReturnType<typeof useDesignDraft>

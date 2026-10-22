import { useState, type FormEvent } from 'react'
import { OwnerError } from '@/data/ownerRepository'
import type { ModifierGroup } from '@/entities/menu/menu'
import { useOwnedBusiness } from '../../dashboardData'
import { ownerErrorText } from '../../ownerErrors'
import { useAsyncAction } from '../../useAsyncAction'
import { checkDraft, draftOf, firstProblem, messagesOf, type GroupDraft, type GroupMessages } from './groupForm'

const NONE: GroupMessages = { rows: {} }

/**
 * The state of the add-on editor: the draft, what is wrong with it, and the save. `submit` gives back the saved name
 * when the group was kept, and null when it was not (the problem is shown and the first bad box has focus).
 */
export function useGroupForm(group: ModifierGroup | null) {
  const { menu, actions } = useOwnedBusiness()
  const [draft, setDraft] = useState<GroupDraft>(() => draftOf(group))
  const [messages, setMessages] = useState<GroupMessages>(NONE)
  const [note, setNote] = useState<string | null>(null)
  const { run, busy } = useAsyncAction()

  const focusProblem = (form: HTMLFormElement, found: GroupMessages) => {
    const selector = firstProblem(draft, found)
    const box = selector ? form.querySelector(selector) : null
    if (box instanceof HTMLElement) box.focus()
  }

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<string | null> => {
    event.preventDefault()
    const form = event.currentTarget
    setNote(null)
    const checked = checkDraft(draft, menu.groups)
    if (!checked.ok) {
      setMessages(checked.messages)
      focusProblem(form, checked.messages)
      return null
    }
    setMessages(NONE)
    const outcome = await run(() => actions.saveGroup(checked.input))
    if (outcome.ok) return checked.input.name
    // The repository checks again. Its refusal of a field is shown at the field, anything else in a note.
    const fields = outcome.error instanceof OwnerError ? outcome.error.fields : {}
    const refused = messagesOf(draft, fields)
    setMessages(refused)
    if (Object.keys(fields).length === 0) setNote(ownerErrorText(outcome.error))
    else focusProblem(form, refused)
    return null
  }

  return { draft, setDraft, messages, note, busy, submit }
}

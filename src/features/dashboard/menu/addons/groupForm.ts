import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS, type GroupInput, type ModifierGroup } from '@/entities/menu/menu'
import { parsePrice, priceInput } from '@/entities/menu/price'
import { validateGroupInput } from '@/entities/menu/validate'
import { cleanText } from '@/shared/lib/text'
import { nameErrorText } from '../nameErrors'

const text = dashboardCopy.addons

/** One option as the owner is typing it: the price is the text of the box, in pesos. */
export type OptionRow = { key: string; id?: string; label: string; price: string }

/** A group as the owner is typing it. The numbers are the text of their boxes, so a half-typed value is not lost. */
export type GroupDraft = { id?: string; name: string; required: boolean; min: string; max: string; rows: OptionRow[] }

/** Words per field, and per option row (by the row's key). */
export type GroupMessages = {
  name?: string
  min?: string
  max?: string
  options?: string
  rows: Record<string, { label?: string; price?: string }>
}

let sequence = 0

export function emptyRow(): OptionRow {
  sequence += 1
  return { key: `row-${sequence}`, label: '', price: '' }
}

/** The editor's start: the group as it is, or a new optional group with one empty option. */
export function draftOf(group: ModifierGroup | null): GroupDraft {
  if (!group) return { name: '', required: false, min: '0', max: '1', rows: [emptyRow()] }
  return {
    id: group.id,
    name: group.name,
    required: group.required,
    min: String(group.min),
    max: String(group.max),
    rows: group.options.map((option) => ({ ...emptyRow(), id: option.id, label: option.label, price: priceInput(option.price) })),
  }
}

/** A whole number as typed, or NaN (which the validator refuses) for anything else. */
function wholeNumber(value: string): number {
  return /^\d{1,3}$/.test(value.trim()) ? Number(value) : Number.NaN
}

/** Required means at least one pick, so the switch and the smallest number move together. */
export function withRequired(draft: GroupDraft, required: boolean): GroupDraft {
  if (!required) return { ...draft, required, min: '0' }
  return { ...draft, required, min: wholeNumber(draft.min) >= 1 ? draft.min : '1' }
}

export function withMin(draft: GroupDraft, min: string): GroupDraft {
  const value = wholeNumber(min)
  return Number.isNaN(value) ? { ...draft, min } : { ...draft, min, required: value >= 1 }
}

/** Keeps the numbers inside the options that are left: nobody can pick more than there are. */
function fitted(draft: GroupDraft): GroupDraft {
  const count = Math.max(draft.rows.length, 1)
  const nextMax = wholeNumber(draft.max) > count ? String(count) : draft.max
  const fits = { ...draft, max: nextMax }
  return wholeNumber(draft.min) > wholeNumber(nextMax) ? withMin(fits, nextMax) : fits
}

export function withRows(draft: GroupDraft, rows: OptionRow[]): GroupDraft {
  return fitted({ ...draft, rows })
}

export function moveRow(rows: readonly OptionRow[], key: string, delta: -1 | 1): OptionRow[] {
  const from = rows.findIndex((row) => row.key === key)
  const a = rows[from]
  const b = rows[from + delta]
  if (a === undefined || b === undefined) return [...rows]
  const next = [...rows]
  next[from] = b
  next[from + delta] = a
  return next
}

function optionsMessage(code: string): string {
  if (code === 'required') return text.errors.optionsRequired
  if (code === 'duplicate') return text.errors.optionsDuplicate
  if (code === 'tooMany') return text.errors.optionsTooMany.replace('{max}', String(LIMITS.options))
  return text.errors.optionsInvalid.replace('{max}', String(LIMITS.optionLabel))
}

/** Words for the codes of refused fields, from the validator here or from the repository. */
export function messagesOf(draft: GroupDraft, codes: Readonly<Record<string, string | undefined>>): GroupMessages {
  const messages: GroupMessages = { rows: {} }
  const name = nameErrorText(text.errors.name, codes['name'], { name: LIMITS.groupName, entries: LIMITS.groups })
  if (name) messages.name = name
  if (codes['min'] !== undefined || codes['required'] !== undefined) {
    messages.min = draft.required && !(wholeNumber(draft.min) >= 1) ? text.errors.minRequired : text.errors.minRange
  }
  if (codes['max'] !== undefined) messages.max = text.errors.maxRange
  const options = codes['options']
  if (options !== undefined) messages.options = optionsMessage(options)
  return messages
}

/** The problems of single option rows, which the owner can see before the validator speaks. */
function rowMessages(rows: readonly OptionRow[]): GroupMessages['rows'] {
  const found: GroupMessages['rows'] = {}
  for (const row of rows) {
    const label = cleanText(row.label) === '' ? text.errors.optionName : undefined
    const price = row.price.trim() !== '' && parsePrice(row.price) === null ? text.errors.optionPrice : undefined
    if (label || price) found[row.key] = { ...(label ? { label } : {}), ...(price ? { price } : {}) }
  }
  return found
}

export type DraftCheck = { ok: true; input: GroupInput } | { ok: false; messages: GroupMessages }

/** Checks the draft the way the repository will, and says what is wrong in words. An empty price box is a free option. */
export function checkDraft(draft: GroupDraft, existing: readonly ModifierGroup[]): DraftCheck {
  const rows = rowMessages(draft.rows)
  const input = {
    ...(draft.id === undefined ? {} : { id: draft.id }),
    name: draft.name,
    required: draft.required,
    min: wholeNumber(draft.min),
    max: wholeNumber(draft.max),
    options: draft.rows.map((row) => ({
      ...(row.id === undefined ? {} : { id: row.id }),
      label: row.label,
      price: parsePrice(row.price.trim() === '' ? '0' : row.price) ?? 0,
    })),
  }
  const checked = validateGroupInput(input, existing)
  const hasRowProblems = Object.keys(rows).length > 0
  if (checked.ok && !hasRowProblems) return { ok: true, input: checked.value }
  const messages = messagesOf(draft, checked.ok ? {} : checked.errors)
  // A row that names its own problem says it better than the list does.
  if (hasRowProblems) delete messages.options
  return { ok: false, messages: { ...messages, rows } }
}

/** The selector of the first box with a problem, in the order the form shows them. */
export function firstProblem(draft: GroupDraft, messages: GroupMessages): string | null {
  if (messages.name) return '[data-field="name"]'
  if (messages.min) return '[data-field="min"]'
  if (messages.max) return '[data-field="max"]'
  const row = draft.rows.find((candidate) => messages.rows[candidate.key])
  if (row) return `[data-row="${row.key}"] [data-part="${messages.rows[row.key]?.label ? 'label' : 'price'}"]`
  const first = draft.rows[0]
  return messages.options && first ? `[data-row="${first.key}"] [data-part="label"]` : null
}

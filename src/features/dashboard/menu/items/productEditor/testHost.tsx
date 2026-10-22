import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { EditorHost } from './EditorHost'

/** Opens the editor on the product (or on a new item when none is named), over the real mock repository. */
export async function openEditor(props: { product?: string; category?: string } = {}, options: DashboardOptions = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const harness = await renderDashboardPage(<EditorHost {...props} onSaved={onSaved} onClose={onClose} />, '/dashboard/menu', options)
  return { ...harness, onClose, onSaved, dialog: screen.getByRole('dialog') as HTMLDialogElement }
}

/** An owner repository whose `saveProduct` and `uploadImage` are replaced, for a refusal, a failure or a call that waits. */
export function withCalls(replace: Partial<Pick<OwnerRepository, 'saveProduct' | 'uploadImage'>>): NonNullable<DashboardOptions['wrapOwner']> {
  return (real) => ({ ...real, ...replace })
}

export const refusal = (code: ConstructorParameters<typeof OwnerError>[0], fields: Record<string, string> = {}) => new OwnerError(code, fields)

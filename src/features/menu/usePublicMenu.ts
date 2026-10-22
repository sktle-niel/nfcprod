import { useCallback } from 'react'
import { publicMenu } from '@/data/publicMenu'
import type { PublicMenuRepository } from '@/data/publicRepository'
import { useResource } from '@/shared/hooks/useResource'

/** Loads the public menu at `slug` (already checked with isValidSlug). `ready` with null means there is no menu at that link. */
export function usePublicMenu(slug: string, repository: PublicMenuRepository = publicMenu) {
  const load = useCallback(() => repository.get(slug), [repository, slug])
  return useResource(load)
}

import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { copy } from '@/config/copy'
import type { PublicMenuRepository } from '@/data/publicRepository'
import { isValidSlug } from '@/entities/business/slug'
import { LoadError } from '@/shared/ui/LoadError'
import { NotFound } from '@/shared/ui/NotFound'
import ui from '@/shared/ui/ui.module.css'
import { MenuFrame } from './MenuFrame'
import styles from './MenuPage.module.css'
import { usePublicMenu } from './usePublicMenu'

const text = copy.menu.page

type Props = {
  /** For tests. The page asks the demo repository by default. */
  repository?: PublicMenuRepository | undefined
}

/** /m/:slug, what a customer sees when the card is tapped. The slug comes from the address, so it is checked before anything uses it. */
export function MenuPage({ repository }: Props) {
  const { slug } = useParams()
  if (!isValidSlug(slug)) return <NotFound />
  return <PublicMenu slug={slug} repository={repository} />
}

function PublicMenu({ slug, repository }: { slug: string; repository: PublicMenuRepository | undefined }) {
  const { resource, retry, retrying } = usePublicMenu(slug, repository)
  const page = useRef<HTMLElement>(null)
  // The failure note and its button are gone once the retry brings the page, so the focus goes to the page's title.
  const handOver = useRef(false)
  useEffect(() => {
    if (retrying) handOver.current = true
    else if (handOver.current && resource.status === 'ready') {
      handOver.current = false
      const title = document.querySelector<HTMLElement>('main h1')
      title?.setAttribute('tabindex', '-1')
      title?.focus()
    }
  }, [retrying, resource.status])

  if (resource.status === 'error' || retrying) {
    return (
      <main ref={page} className="page-center">
        <title>{text.error.title}</title>
        <h1>{text.error.title}</h1>
        {/* Always there, so a screen reader hears when the retry starts to load. */}
        <p role="status" className={ui.visuallyHidden}>
          {retrying ? text.loading : ''}
        </p>
        <LoadError message={text.error.message} retryLabel={text.error.retry} onRetry={retry} focusTitleIn={page} busy={retrying} />
      </main>
    )
  }

  if (resource.status === 'loading') {
    return (
      <main className={styles.loading}>
        <p role="status">{text.loading}</p>
      </main>
    )
  }

  if (resource.value === null) {
    return (
      <main className="page-center">
        <title>{text.notAvailable.title}</title>
        <h1>{text.notAvailable.title}</h1>
        <p>{text.notAvailable.body}</p>
        <Link to="/">{text.notAvailable.home}</Link>
      </main>
    )
  }

  const { business, menu } = resource.value
  return (
    <>
      <title>{business.name}</title>
      <MenuFrame business={business} menu={menu} />
    </>
  )
}

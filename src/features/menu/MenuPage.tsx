import { useParams } from 'react-router-dom'
import { copy } from '@/config/copy'
import { isValidSlug } from '@/entities/business/slug'
import { NotFound } from '@/shared/ui/NotFound'

export function MenuPage() {
  const { slug } = useParams()
  // URL params are untrusted input: validate before using them anywhere.
  if (!isValidSlug(slug)) return <NotFound />

  return (
    <main className="page-center">
      <h1>{slug}</h1>
      <p>{copy.menu.comingSoon}</p>
    </main>
  )
}

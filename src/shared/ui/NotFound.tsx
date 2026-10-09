import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'

export function NotFound() {
  return (
    <main className="page-center">
      <h1>{copy.notFound.title}</h1>
      <p>{copy.notFound.body}</p>
      <Link to="/">{copy.notFound.home}</Link>
    </main>
  )
}

import { copy } from '@/config/copy'

// Shown when a route throws. Never renders the error itself (no internals leaked to users).
export function RouteError() {
  return (
    <main className="page-center" role="alert">
      <h1>{copy.error.title}</h1>
      <p>{copy.error.body}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {copy.error.retry}
      </button>
    </main>
  )
}

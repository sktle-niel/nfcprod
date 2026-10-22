import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'

type Props = {
  /** Inside a shell that already has a main landmark: a plain block, so the page has one main. */
  inline?: boolean
}

export function NotFound({ inline = false }: Props) {
  const Root = inline ? 'div' : 'main'
  return (
    <Root className={inline ? 'page-center page-center-inline' : 'page-center'}>
      <h1>{copy.notFound.title}</h1>
      <p>{copy.notFound.body}</p>
      <Link to="/">{copy.notFound.home}</Link>
    </Root>
  )
}

import { useLook } from '../look'
import { HEADER_COMPONENTS } from './index'
import type { HeaderProps } from './types'

/** The top of the menu, drawn as the menu's look says (`header` in the theme). */
export function MenuHeader(props: HeaderProps) {
  const { header } = useLook()
  const Header = HEADER_COMPONENTS[header]
  return <Header {...props} />
}

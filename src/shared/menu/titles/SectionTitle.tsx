import { useLook } from '../look'
import { TITLE_COMPONENTS } from './index'
import type { TitleProps } from './types'

/** The name of a category, drawn as the menu's look says (`title` in the theme). It is always a real heading. */
export function SectionTitle(props: TitleProps) {
  const { title } = useLook()
  const Title = TITLE_COMPONENTS[title]
  return <Title {...props} />
}

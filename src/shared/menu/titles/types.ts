/** What every kind of category title is given. */
export type TitleProps = {
  /** The heading tag: h2 on the public page, h3 in a preview inside another page. */
  as: 'h2' | 'h3'
  id: string
  name: string
}

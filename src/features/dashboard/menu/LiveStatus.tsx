import ui from '@/shared/ui/ui.module.css'

type Props = {
  message: string
  /** Changes with every announcement, even when the words are the same as the last time. */
  version: number
}

/**
 * A screen-reader-only status line. The region is always in the page (even empty), so a message put in it is read out.
 * The words sit in a node that is new for each announcement, so saying the same thing twice is read twice.
 */
export function LiveStatus({ message, version }: Props) {
  return (
    <p role="status" className={ui.visuallyHidden}>
      <span key={version}>{message}</span>
    </p>
  )
}

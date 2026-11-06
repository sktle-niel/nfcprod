import styles from './BoardSection.module.css'

/** Fades a picture in once it has arrived. The picture is visible by default: only one still loading, seen by this script, waits. */
function fadeInOnLoad(image: HTMLImageElement | null) {
  if (image === null || image.complete) return undefined
  const done = () => image.removeAttribute('data-loading')
  image.setAttribute('data-loading', '')
  image.addEventListener('load', done, { once: true })
  image.addEventListener('error', done, { once: true })
  return () => {
    image.removeEventListener('load', done)
    image.removeEventListener('error', done)
    done()
  }
}

type Props = { src: string; /** True for a picture on the first screen, which should not wait. */ eager: boolean; interactive: boolean }

/** A small framed print hung level at the header of a category. Its box is fixed, so nothing moves as it arrives. */
export function PinnedPrint({ src, eager, interactive }: Props) {
  return (
    <span className={styles.pin}>
      <img ref={interactive ? fadeInOnLoad : undefined} src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </span>
  )
}

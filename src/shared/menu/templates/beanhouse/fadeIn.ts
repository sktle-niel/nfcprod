/**
 * A ref for a picture that is still on its way: it fades in when it arrives, in a box that already holds its place. The hold is set
 * only here, by script, so with no script the picture simply shows; one that is already there is not held, and one that fails lets go.
 */
export function fadeIn(picture: HTMLImageElement | null): (() => void) | undefined {
  if (picture === null || picture.complete) return undefined
  const arrive = () => {
    picture.removeAttribute('data-arriving')
    picture.removeEventListener('load', arrive)
    picture.removeEventListener('error', arrive)
  }
  picture.setAttribute('data-arriving', '')
  picture.addEventListener('load', arrive)
  picture.addEventListener('error', arrive)
  return arrive
}

import { createContext, useContext, useEffect } from 'react'

/** Set by the Modal, so a form inside it can say that its call is in flight without the Modal sitting below the form's hook. */
export const ModalBusyContext = createContext<(busy: boolean) => void>(() => {})

/**
 * Tells the Modal around this component that work is running. While `busy` the dialog cannot be dismissed (the corner
 * button, the backdrop, Escape and the back gesture do nothing); the `close` handed to the content still works, so the form
 * can close the dialog after the work succeeded.
 */
export function useModalBusy(busy: boolean) {
  const setBusy = useContext(ModalBusyContext)
  useEffect(() => {
    setBusy(busy)
    return () => setBusy(false)
  }, [busy, setBusy])
}

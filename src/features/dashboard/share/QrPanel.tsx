import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { COPY_GAP_MS, COPY_RESET_MS } from '@/shared/hooks/useCopyToClipboard'
import { Button } from '@/shared/ui/Button'
import { IconDownload } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import { QrCode } from './qr/QrCode'
import { qrPngBlob, qrSvgText, saveBlob } from './qr/qrFiles'
import { qrMatrix } from './qr/qrMatrix'
import styles from './QrPanel.module.css'
import shared from './Share.module.css'

const text = dashboardCopy.share.qr

type Props = {
  /** The full link the code opens. */
  url: string
  /** Names the downloaded files. */
  slug: string
}

type Note = 'done' | 'failed'

/**
 * What the last download said, for the link it was made from. Every press empties it first and answers after a short
 * pause, so a second download is heard again (a live region speaks only a change). 'done' goes after a few seconds;
 * 'failed' stays until the next press.
 */
function useDownloadNote(url: string) {
  const [note, setNote] = useState<{ url: string; note: Note } | null>(null)
  const press = useRef(0)
  const gap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (note?.note !== 'done') return
    const timer = setTimeout(() => setNote(null), COPY_RESET_MS)
    return () => clearTimeout(timer)
  }, [note])
  useEffect(
    () => () => {
      press.current += 1
      clearTimeout(gap.current)
    },
    [],
  )

  const begin = () => {
    clearTimeout(gap.current)
    setNote(null)
    return ++press.current
  }
  const answer = (mine: number, next: Note) => {
    if (mine !== press.current) return
    gap.current = setTimeout(() => setNote({ url, note: next }), COPY_GAP_MS)
  }
  return { note: note?.url === url ? note.note : null, begin, answer }
}

/** The QR code of the menu link, with the two downloads. */
export function QrPanel({ url, slug }: Props) {
  const matrix = useMemo(() => qrMatrix(url), [url])
  const { note, begin, answer } = useDownloadNote(url)

  const downloadSvg = () => {
    if (!matrix) return
    const press = begin()
    saveBlob(new Blob([qrSvgText(matrix)], { type: 'image/svg+xml' }), `${slug}-qr.svg`)
    answer(press, 'done')
  }
  const downloadPng = async () => {
    if (!matrix) return
    const press = begin()
    try {
      saveBlob(await qrPngBlob(matrix), `${slug}-qr.png`)
      answer(press, 'done')
    } catch {
      answer(press, 'failed')
    }
  }

  return (
    <Panel title={text.title}>
      {matrix ? (
        <>
          <QrCode matrix={matrix} label={text.label.replace('{url}', url)} className={styles.tile} />
          <p className={shared.body}>{text.body}</p>
          <div className={shared.actions}>
            <Button variant="secondary" onClick={downloadSvg}>
              <IconDownload size={18} />
              {text.svg}
            </Button>
            <Button variant="secondary" onClick={() => void downloadPng()}>
              <IconDownload size={18} />
              {text.png}
            </Button>
          </div>
        </>
      ) : (
        <p role="alert" className={shared.error}>
          {text.tooLong}
        </p>
      )}
      <p role="status" className={shared.note}>
        {note === 'done' ? text.downloaded : ''}
      </p>
      {note === 'failed' && (
        <p role="alert" className={shared.error}>
          {text.failed}
        </p>
      )}
    </Panel>
  )
}

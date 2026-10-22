import type { Count } from './chart'
import ui from './ui.module.css'

type Props = {
  caption: string
  points: readonly Count[]
  format: (value: number) => string
}

/**
 * The numbers behind a small plot, for screen readers. Every plot has one, so no value is only in a tooltip.
 * The table sits in a clipped box on purpose: a table ignores `height` and `overflow: hidden`, so hidden on its own
 * it keeps its full height, stretches the page past the shell and pushes the sticky sidebar out of view.
 */
export function ChartTable({ caption, points, format }: Props) {
  return (
    <div className={ui.visuallyHidden}>
      <table>
        <caption>{caption}</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{format(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

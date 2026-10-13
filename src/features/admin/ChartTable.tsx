import type { Count } from './stats'
import ui from './ui.module.css'

type Props = {
  caption: string
  points: readonly Count[]
  format: (value: number) => string
}

/** The numbers behind a small plot, for screen readers. Every plot has one, so no value is only in a tooltip. */
export function ChartTable({ caption, points, format }: Props) {
  return (
    <table className={ui.visuallyHidden}>
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
  )
}

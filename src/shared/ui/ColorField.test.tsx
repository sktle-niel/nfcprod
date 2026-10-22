import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ColorField } from './ColorField'

function Harness({ initial = '#2f80ed', onChange }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <ColorField
      label="Accent color"
      swatchLabel="Pick the accent color"
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const swatch = () => screen.getByLabelText<HTMLInputElement>('Pick the accent color')

describe('ColorField', () => {
  it('has a text input named by the label and a separately named swatch', () => {
    render(<Harness />)
    expect(screen.getByRole('textbox', { name: 'Accent color' })).toHaveValue('#2f80ed')
    expect(swatch()).toHaveAttribute('type', 'color')
    expect(swatch()).toHaveValue('#2f80ed')
  })

  it('hands over exactly what is typed, even half a color', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial="" onChange={onChange} />)
    await user.type(screen.getByRole('textbox', { name: 'Accent color' }), '#AB')
    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['#', '#A', '#AB'])
    expect(screen.getByRole('textbox', { name: 'Accent color' })).toHaveValue('#AB')
  })

  it('shows black on the swatch while the text is not a color, and never a stale color', () => {
    render(<Harness initial="#12" />)
    expect(swatch()).toHaveValue('#000000')
  })

  it('shows a typed color on the swatch in lower case', () => {
    render(<Harness initial="#ABCDEF" />)
    expect(swatch()).toHaveValue('#abcdef')
  })

  it('reports a valid hex when the swatch changes, and the text follows', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(swatch(), { target: { value: '#00ff80' } })
    expect(onChange).toHaveBeenCalledWith('#00ff80')
    expect(screen.getByRole('textbox', { name: 'Accent color' })).toHaveValue('#00ff80')
  })

  it('stops the text at 7 characters', () => {
    render(<Harness />)
    expect(screen.getByRole('textbox', { name: 'Accent color' })).toHaveAttribute('maxlength', '7')
  })

  it('wires the hint to the input', () => {
    render(<ColorField label="Color" swatchLabel="Swatch" value="#000000" onChange={() => {}} hint="Six digits" />)
    expect(screen.getByRole('textbox', { name: 'Color' })).toHaveAccessibleDescription('Six digits')
  })

  it('wires the error to the input, marks it invalid and hides the hint', () => {
    render(
      <ColorField label="Color" swatchLabel="Swatch" value="#zz" onChange={() => {}} hint="Six digits" error="Not a color" />,
    )
    const input = screen.getByRole('textbox', { name: 'Color' })
    expect(input).toHaveAccessibleDescription('Not a color')
    expect(input).toBeInvalid()
    expect(screen.queryByText('Six digits')).not.toBeInTheDocument()
  })

  it('has no description and is valid without hint or error', () => {
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: 'Accent color' })
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).toBeValid()
  })

  it('disables both controls', () => {
    render(<ColorField label="Color" swatchLabel="Swatch" value="#000000" onChange={() => {}} disabled />)
    expect(screen.getByRole('textbox', { name: 'Color' })).toBeDisabled()
    expect(screen.getByLabelText('Swatch')).toBeDisabled()
  })
})

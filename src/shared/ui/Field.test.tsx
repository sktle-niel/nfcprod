import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'

describe('Field', () => {
  it('stays uncontrolled by default: it starts from defaultValue and the person edits it', async () => {
    render(<Field name="note" label="Note" maxLength={40} defaultValue="Hello" />)
    const input = screen.getByRole('textbox', { name: 'Note' })
    expect(input).toHaveValue('Hello')
    await userEvent.type(input, '!')
    expect(input).toHaveValue('Hello!')
  })

  it('is controlled when it gets a value: it shows the value and reports each edit', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState('Hi')
      return (
        <Field
          name="note"
          label="Note"
          maxLength={40}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            onChange(event.target.value)
          }}
        />
      )
    }
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: 'Note' })
    expect(input).toHaveValue('Hi')
    await userEvent.type(input, 'yo')
    expect(onChange.mock.calls).toEqual([['Hiy'], ['Hiyo']])
    expect(input).toHaveValue('Hiyo')
  })

  it('shows what the parent says even when the parent refuses the edit', async () => {
    render(<Field name="note" label="Note" maxLength={40} value="fixed" onChange={() => {}} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Note' }), 'x')
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('fixed')
  })

  it('can be a controlled textarea too', async () => {
    const typed = vi.fn()
    render(<Field name="about" label="About" maxLength={80} multiline value="Abc" onChange={(event) => typed(event.target.value)} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'About' }), 'd')
    expect(typed.mock.calls).toEqual([['Abcd']])
  })

  it('wires the hint and the error to the input', () => {
    const { rerender } = render(<Field name="note" label="Note" maxLength={40} hint="Short" />)
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveAccessibleDescription('Short')
    rerender(<Field name="note" label="Note" maxLength={40} hint="Short" error="Required" />)
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveAccessibleDescription('Required')
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeInvalid()
  })
})

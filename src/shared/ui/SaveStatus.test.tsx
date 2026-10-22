import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SaveStatus, type SaveState } from './SaveStatus'

const messages = { saving: 'Saving', saved: 'All changes saved', error: 'Could not save' }

describe('SaveStatus', () => {
  it('keeps a live region in the page and shows nothing while idle', () => {
    render(<SaveStatus status="idle" messages={messages} />)
    const region = screen.getByRole('status')
    expect(region).toBeInTheDocument()
    expect(region).toBeEmptyDOMElement()
  })

  it.each<[Exclude<SaveState, 'idle'>, string]>([
    ['saving', 'Saving'],
    ['saved', 'All changes saved'],
    ['error', 'Could not save'],
  ])('shows the words given for %s', (status, words) => {
    render(<SaveStatus status={status} messages={messages} />)
    expect(screen.getByRole('status')).toHaveTextContent(words)
  })

  it('changes the text inside the same live region when the state changes', () => {
    const { rerender } = render(<SaveStatus status="saving" messages={messages} />)
    const region = screen.getByRole('status')
    rerender(<SaveStatus status="saved" messages={messages} />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent('All changes saved')
    rerender(<SaveStatus status="idle" messages={messages} />)
    expect(region).toBeEmptyDOMElement()
  })
})

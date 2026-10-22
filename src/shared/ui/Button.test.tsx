import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button, buttonClass } from './Button'

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('can be a submit button', () => {
    render(<Button type="submit">Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit')
  })

  it('runs onClick from the mouse and from Enter and Space', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    await user.click(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('is disabled and marked busy while work runs, and does not click', async () => {
    const onClick = vi.fn()
    render(
      <Button busy onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('has no aria-busy when it is not busy', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-busy')
  })

  it('can be disabled without being busy', () => {
    render(<Button disabled>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('hands its ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Save</Button>)
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Save' }))
  })

  it('passes native props such as aria-label through', () => {
    render(<Button aria-label="Save changes">Save</Button>)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('gives each variant and size its own class, which a link can wear too', () => {
    expect(buttonClass('primary', 'md')).not.toBe(buttonClass('danger', 'md'))
    expect(buttonClass('primary', 'md')).not.toBe(buttonClass('primary', 'sm'))
    expect(buttonClass()).toBe(buttonClass('primary', 'md'))
    render(
      <>
        <Button variant="danger" size="sm">
          Delete
        </Button>
        <a href="/x" className={buttonClass('secondary')}>
          Open
        </a>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Delete' }).className).toBe(buttonClass('danger', 'sm'))
    expect(screen.getByRole('link', { name: 'Open' }).className).toBe(buttonClass('secondary'))
  })
})

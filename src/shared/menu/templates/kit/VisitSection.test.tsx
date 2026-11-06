import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VisitSection, type VisitClassNames } from './VisitSection'

const none = { phone: '', address: '', hours: '', social: { facebook: '', instagram: '', tiktok: '', website: '' } }
const full = {
  phone: '0917 123 4567',
  address: '12 Mabini St, Manila',
  hours: 'Mon-Fri 7-5\nSat 8-3',
  social: { facebook: 'https://facebook.com/luna', instagram: '', tiktok: '', website: 'http://not-safe.example' },
}

const draw = (business = full, interactive = true, classNames?: VisitClassNames) =>
  render(<VisitSection business={business} interactive={interactive} id="visit" headingTag="h2" classNames={classNames} />)

describe('VisitSection on a live page', () => {
  it('is a named landmark with the given id and heading level', () => {
    draw()
    const region = screen.getByRole('region', { name: 'Visit' })
    expect(region).toHaveAttribute('id', 'visit')
    expect(region.tagName).toBe('SECTION')
    expect(within(region).getByRole('heading', { level: 2, name: 'Visit' })).toBeInTheDocument()
  })

  it('takes the heading level the template asks for', () => {
    render(<VisitSection business={full} interactive id="visit" headingTag="h3" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Visit' })).toBeInTheDocument()
  })

  it('keeps the hours as written, line breaks included', () => {
    const { container } = draw()
    const hours = container.querySelector('[data-fact="hours"]')
    expect(hours?.textContent).toContain('Mon-Fri 7-5\nSat 8-3')
  })

  it('links the address to directions in a new tab, with no way back to this page', () => {
    draw()
    expect(screen.getByText('12 Mabini St, Manila')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Directions, opens in a new tab' })
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=12%20Mabini%20St%2C%20Manila')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('offers a call on a phone that can be dialed, and plain text on one that cannot', () => {
    const { unmount } = draw()
    expect(screen.getByRole('link', { name: '0917 123 4567' })).toHaveAttribute('href', 'tel:09171234567')
    unmount()
    draw({ ...none, phone: 'Ask at the counter' })
    expect(screen.getByText('Ask at the counter')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('links only clean https social links, in a new tab', () => {
    draw()
    const link = screen.getByRole('link', { name: 'Facebook' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: 'Website' })).toBeNull()
  })

  it('shows only the facts it has data for', () => {
    const { container } = draw({ ...none, address: 'Manila' })
    expect([...container.querySelectorAll('[data-fact]')].map((fact) => fact.getAttribute('data-fact'))).toEqual(['address'])
    expect(screen.queryByText('Hours')).toBeNull()
  })

  it('draws nothing at all with nothing to show', () => {
    const { container } = draw({ ...none, phone: '  ', address: ' \n', hours: ' ', social: { ...none.social, website: 'javascript:alert(1)' } })
    expect(container).toBeEmptyDOMElement()
  })

  it('adds a template class to each part, beside its own', () => {
    const { container } = draw(full, true, { root: 'r', heading: 'h', facts: 'fs', fact: 'f', label: 'l', value: 'v', link: 'k', social: 's' })
    for (const name of ['r', 'h', 'fs', 'f', 'l', 'v', 'k', 's']) expect(container.querySelector(`.${name}`), name).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveClass('k')
  })
})

describe('VisitSection in the Design preview', () => {
  it('has no links, no landmark and no tab stops, and shows the same words', () => {
    const { container } = draw(full, false)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
    expect(container.querySelector('section')).toBeNull()
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
    expect(container.textContent).toContain('12 Mabini St, Manila')
    expect(container.textContent).toContain('0917 123 4567')
    expect(container.textContent).toContain('Facebook')
    expect(screen.queryByText('Directions')).toBeNull()
  })

  it('keeps the id, which the preview frame scrolls to', () => {
    const { container } = draw(full, false)
    expect(container.querySelector('#visit')).not.toBeNull()
  })
})

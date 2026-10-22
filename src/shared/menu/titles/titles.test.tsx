import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, TITLES, type TitleKind } from '@/entities/theme/theme'
import { lookOf, LookProvider } from '../look'
import { splitFirstWord } from './splitFirstWord'
import { SectionTitle } from './SectionTitle'

function renderTitle(title: TitleKind, name: string, as: 'h2' | 'h3' = 'h2') {
  return render(
    <LookProvider value={lookOf({ ...DEFAULT_THEME, title })}>
      <SectionTitle as={as} id="section-1-title" name={name} />
    </LookProvider>,
  )
}

describe('the category titles', () => {
  it.each(TITLES)('draws "%s" as one real heading that reads exactly the name, at the level asked', (title) => {
    const { container } = renderTitle(title, 'Iced Coffee', 'h3')
    const heading = screen.getByRole('heading', { level: 3, name: 'Iced Coffee' })
    expect(heading).toHaveAttribute('id', 'section-1-title')
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1)
    // The decoration is drawn with CSS: the only words are the name (capitals come from CSS too, the text keeps its case).
    expect(heading.textContent?.replace(/\s+/g, ' ')).toBe('Iced Coffee')
  })

  it.each(TITLES)('keeps a name with markup as plain text in "%s"', (title) => {
    const { container } = renderTitle(title, '<img src=x onerror=alert(1)> Specials')
    expect(screen.getByRole('heading', { level: 2, name: '<img src=x onerror=alert(1)> Specials' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('splits the script title into the first word and the rest, both inside the one heading', () => {
    renderTitle('script', 'Iced  Coffee Drinks')
    const heading = screen.getByRole('heading', { level: 2, name: 'Iced Coffee Drinks' })
    const parts = [...heading.querySelectorAll('span')].map((span) => span.textContent)
    expect(parts).toEqual(['Iced', 'Coffee Drinks'])
  })

  it('draws a one-word script title as the bold part only', () => {
    renderTitle('script', 'Pastries')
    const heading = screen.getByRole('heading', { level: 2, name: 'Pastries' })
    expect([...heading.querySelectorAll('span')].map((span) => span.textContent)).toEqual(['Pastries'])
  })

  it('finds the first word of a name, whatever the spaces around it', () => {
    expect(splitFirstWord('Hot')).toEqual(['Hot', ''])
    expect(splitFirstWord('  Iced   Coffee ')).toEqual(['Iced', 'Coffee'])
    expect(splitFirstWord('Ice cream and shakes')).toEqual(['Ice', 'cream and shakes'])
  })
})

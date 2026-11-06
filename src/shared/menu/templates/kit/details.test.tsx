import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { sampleMenu } from '@/test/ownerFixtures'
import { hasDetails, optionExtra } from './details'
import { ProductDetails } from './ProductDetails'

const option = (id: string, label: string, price: number) => ({ id, label, price })
const sugar: ModifierGroup = { ...(sampleMenu().groups[0] as ModifierGroup), id: 'sugar', name: 'Sugar', options: [option('a', '0%', 0), option('b', '50%', 0)] }
const milk: ModifierGroup = { ...sugar, id: 'milk', name: 'Milk', options: [option('c', 'Whole', 0), option('d', 'Oat', 3000)] }
const product = (groupIds: string[]): Product => ({ ...(sampleMenu().products[0] as Product), variants: [], groupIds })

describe('the add-on prices of the kit', () => {
  it('says nothing about the price of a group where nothing costs extra', () => {
    expect(optionExtra(sugar.options[0]!, sugar)).toBe('')
  })

  it('says Free beside a choice that costs something, and the price of that choice', () => {
    expect(optionExtra(milk.options[0]!, milk)).toBe('Free')
    expect(optionExtra(milk.options[1]!, milk)).toBe('+₱30')
  })

  it('never reads like a discount, and keeps each price in one piece', () => {
    render(<ProductDetails product={product(['sugar', 'milk'])} groups={[sugar, milk]} ground="card" />)
    expect(screen.getByText(/^0%/)).toHaveTextContent('0% · 50%')
    expect(screen.queryByText(/% Free/)).not.toBeInTheDocument()
    expect(screen.getByText('+₱30').tagName).toBe('SPAN')
  })

  it('counts only the groups the menu has', () => {
    expect(hasDetails(product(['gone']), [sugar])).toBe(false)
    expect(hasDetails(product(['sugar']), [sugar])).toBe(true)
  })
})

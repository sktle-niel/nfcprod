import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS, type ModifierGroup } from '@/entities/menu/menu'
import { checkDraft, draftOf, emptyRow, moveRow, withMin, withRequired, withRows, type GroupDraft } from './groupForm'
import { optionPriceText, ruleText } from './groupText'

const text = dashboardCopy.addons

const milk: ModifierGroup = {
  id: 'grp-milk',
  name: 'Milk',
  required: false,
  min: 0,
  max: 2,
  options: [
    { id: 'opt-oat', label: 'Oat milk', price: 4500 },
    { id: 'opt-soy', label: 'Soy milk', price: 3500 },
  ],
}

function filled(change: Partial<GroupDraft> = {}): GroupDraft {
  return { ...draftOf(milk), ...change }
}

describe('draftOf', () => {
  it('starts a new group as optional with one empty option', () => {
    const draft = draftOf(null)
    expect(draft).toMatchObject({ name: '', required: false, min: '0', max: '1' })
    expect(draft.rows).toHaveLength(1)
  })

  it('writes the prices of an existing group in pesos and keeps the ids', () => {
    const draft = draftOf(milk)
    expect(draft.id).toBe('grp-milk')
    expect(draft.rows.map((row) => [row.id, row.label, row.price])).toEqual([
      ['opt-oat', 'Oat milk', '45'],
      ['opt-soy', 'Soy milk', '35'],
    ])
  })
})

describe('the required switch and the smallest number', () => {
  it('turning required on makes the smallest number at least 1', () => {
    expect(withRequired(filled(), true)).toMatchObject({ required: true, min: '1' })
  })

  it('turning required on keeps a smallest number that is already 1 or more', () => {
    expect(withRequired(filled({ min: '2' }), true)).toMatchObject({ required: true, min: '2' })
  })

  it('turning required off sets the smallest number to 0', () => {
    expect(withRequired(filled({ required: true, min: '2' }), false)).toMatchObject({ required: false, min: '0' })
  })

  it('typing a smallest number of 1 or more makes the group required, and 0 makes it optional', () => {
    expect(withMin(filled(), '1').required).toBe(true)
    expect(withMin(filled({ required: true, min: '1' }), '0').required).toBe(false)
  })

  it('leaves the switch alone while the box holds something that is not a number', () => {
    expect(withMin(filled({ required: true, min: '1' }), '').required).toBe(true)
  })
})

describe('keeping the numbers inside the options', () => {
  it('lowers the most to the number of options that are left', () => {
    const draft = filled({ max: '2' })
    const next = withRows(draft, draft.rows.slice(0, 1))
    expect(next.max).toBe('1')
  })

  it('lowers the smallest number with it, and keeps the group required', () => {
    const draft = filled({ required: true, min: '2', max: '2' })
    const next = withRows(draft, draft.rows.slice(0, 1))
    expect(next).toMatchObject({ min: '1', max: '1', required: true })
  })

  it('leaves the numbers alone when options are added', () => {
    const draft = filled({ max: '1' })
    expect(withRows(draft, [...draft.rows, emptyRow()]).max).toBe('1')
  })
})

describe('moveRow', () => {
  it('swaps a row with its neighbour and ignores a move past either end', () => {
    const rows = draftOf(milk).rows
    const [first, second] = rows
    expect(moveRow(rows, first!.key, 1).map((row) => row.key)).toEqual([second!.key, first!.key])
    expect(moveRow(rows, first!.key, -1).map((row) => row.key)).toEqual([first!.key, second!.key])
    expect(moveRow(rows, 'nope', 1)).toEqual(rows)
  })
})

describe('checkDraft', () => {
  it('turns a good draft into the input the repository takes, with prices in centavos', () => {
    const checked = checkDraft(filled({ name: '  Milk  ' }), [])
    expect(checked).toEqual({
      ok: true,
      input: {
        id: 'grp-milk',
        name: 'Milk',
        required: false,
        min: 0,
        max: 2,
        options: [
          { id: 'opt-oat', label: 'Oat milk', price: 4500 },
          { id: 'opt-soy', label: 'Soy milk', price: 3500 },
        ],
      },
    })
  })

  it('reads an empty price box as a free option', () => {
    const draft = filled()
    const rows = draft.rows.map((row, index) => (index === 0 ? { ...row, price: '' } : row))
    const checked = checkDraft({ ...draft, rows }, [])
    expect(checked.ok && checked.input.options[0]?.price).toBe(0)
  })

  it('names the option with no name and the price that is not a price', () => {
    const draft = filled()
    const [first, second] = draft.rows
    const rows = [{ ...first!, label: '   ' }, { ...second!, price: 'abc' }]
    const checked = checkDraft({ ...draft, rows }, [])
    expect(checked.ok).toBe(false)
    if (checked.ok) return
    expect(checked.messages.rows[first!.key]).toEqual({ label: text.errors.optionName })
    expect(checked.messages.rows[second!.key]).toEqual({ price: text.errors.optionPrice })
    expect(checked.messages.options).toBeUndefined()
  })

  it('refuses a name another group already has, ignoring case', () => {
    const other: ModifierGroup = { ...milk, id: 'grp-other', name: 'MILK' }
    const checked = checkDraft(filled({ id: 'grp-new', name: 'milk' }), [other])
    expect(checked.ok).toBe(false)
    if (!checked.ok) expect(checked.messages.name).toBeDefined()
  })

  it('refuses two options with the same name', () => {
    const draft = filled()
    const rows = draft.rows.map((row) => ({ ...row, label: 'Oat milk' }))
    const checked = checkDraft({ ...draft, rows }, [])
    expect(checked.ok || checked.messages.options).toBe(text.errors.optionsDuplicate)
  })

  it('refuses a most that is more than the options, and a smallest that is more than the most', () => {
    const tooMany = checkDraft(filled({ max: '5' }), [])
    expect(tooMany.ok || tooMany.messages.max).toBe(text.errors.maxRange)
    const tooHigh = checkDraft(filled({ required: true, min: '3', max: '2' }), [])
    expect(tooHigh.ok || tooHigh.messages.min).toBe(text.errors.minRange)
  })

  it('refuses a max that is not a number', () => {
    const checked = checkDraft(filled({ max: 'two' }), [])
    expect(checked.ok || checked.messages.max).toBe(text.errors.maxRange)
  })

  it('refuses more options than the limit', () => {
    const rows = Array.from({ length: LIMITS.options + 1 }, (_, index) => ({ ...emptyRow(), label: `Option ${index}` }))
    const checked = checkDraft(filled({ rows, max: '1' }), [])
    expect(checked.ok || checked.messages.options).toContain(String(LIMITS.options))
  })
})

describe('the words about a group', () => {
  it('writes the rule for a required, an optional and a fixed group', () => {
    expect(ruleText({ required: true, min: 1, max: 3 })).toBe('Pick 1 to 3')
    expect(ruleText({ required: false, min: 0, max: 2 })).toBe('Pick up to 2')
    expect(ruleText({ required: true, min: 2, max: 2 })).toBe('Pick 2')
  })

  it('writes what an option adds, or Free', () => {
    expect(optionPriceText(1000)).toBe('+₱10')
    expect(optionPriceText(0)).toBe('Free')
  })
})

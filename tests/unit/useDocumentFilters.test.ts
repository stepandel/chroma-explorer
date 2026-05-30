import { describe, expect, it } from 'vitest'
import { buildWhereClause, inferValueType } from '../../src/hooks/useDocumentFilters'

describe('document filter helpers', () => {
  it('infers booleans, numbers, and strings', () => {
    expect(inferValueType('true')).toBe(true)
    expect(inferValueType('-3.5')).toBe(-3.5)
    expect(inferValueType('hello')).toBe('hello')
  })

  it('builds a single metadata where clause', () => {
    expect(buildWhereClause([{ id: '1', key: 'published', operator: '$eq', value: 'true' }])).toEqual({
      published: { $eq: true },
    })
  })

  it('combines multiple metadata filters with $and', () => {
    expect(buildWhereClause([
      { id: '1', key: 'category', operator: '$eq', value: 'docs' },
      { id: '2', key: 'score', operator: '$gte', value: '10' },
    ])).toEqual({
      $and: [
        { category: { $eq: 'docs' } },
        { score: { $gte: 10 } },
      ],
    })
  })
})


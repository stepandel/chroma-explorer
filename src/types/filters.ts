import type { Where } from 'chromadb'

// Query scope: semantic search or filter-by-ID
export type QueryScope = 'query' | 'id'

export type MetadataOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'

export interface MetadataFilter {
  id: string // UUID for React keys
  key: string
  operator: MetadataOperator
  value: string
}

export interface DocumentFilters {
  queryText: string
  nResults: number // Max results for semantic search
  metadataFilters: MetadataFilter[]
}

// A single metadata filter condition (used by QueryToolbar)
export interface QueryMetadataFilter {
  id: string
  field: string
  operator: MetadataOperator
  value: string
}

// Legacy filter row type (kept for any consumers still using the old FilterRow component)
export type FilterRowType = 'search' | 'metadata' | 'select'

export interface FilterRow {
  id: string
  type: FilterRowType
  // For search type
  searchValue?: string
  // For metadata type
  metadataKey?: string
  operator?: MetadataOperator
  metadataValue?: string
  // For select type
  selectField?: 'id'
  selectValue?: string
}

export function getOperatorLabel(operator: MetadataOperator): string {
  switch (operator) {
    case '$eq': return '='
    case '$ne': return '!='
    case '$gt': return '>'
    case '$gte': return '>='
    case '$lt': return '<'
    case '$lte': return '<='
    case '$in': return 'in'
    case '$nin': return 'not in'
  }
}

export function getOperatorsForType(
  valueType: 'string' | 'number' | 'boolean' | 'unknown'
): MetadataOperator[] {
  switch (valueType) {
    case 'number':
      return ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin']
    case 'boolean':
      return ['$eq', '$ne']
    case 'string':
    default:
      return ['$eq', '$ne', '$in', '$nin']
  }
}

// Parse a raw string filter value into the correct primitive(s) for Chroma's where clause
export function parseFilterValue(
  value: string,
  operator: MetadataOperator,
  fieldType?: 'string' | 'number' | 'boolean'
): string | number | boolean | Array<string | number | boolean> {
  const trimmed = value.trim()
  if (operator === '$in' || operator === '$nin') {
    return trimmed.split(',').map(v => coerce(v.trim(), fieldType))
  }
  return coerce(trimmed, fieldType)
}

function coerce(value: string, fieldType?: 'string' | 'number' | 'boolean'): string | number | boolean {
  if (fieldType === 'string') return value
  if (fieldType === 'number') {
    const num = Number(value)
    return !isNaN(num) ? num : value
  }
  if (fieldType === 'boolean') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
    return value
  }

  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  if (value === '') return value
  const num = Number(value)
  if (!isNaN(num)) return num
  return value
}

export function buildChromaWhereClause(
  filters: QueryMetadataFilter[],
  fieldTypes?: Record<string, 'string' | 'number' | 'boolean'>
): Where | undefined {
  const valid = filters.filter(f => f.field.trim() && f.value.trim())
  if (valid.length === 0) return undefined

  const clauses = valid.map(f => ({
    [f.field]: { [f.operator]: parseFilterValue(f.value, f.operator, fieldTypes?.[f.field]) },
  } as Where))

  if (clauses.length === 1) return clauses[0]
  return { $and: clauses }
}

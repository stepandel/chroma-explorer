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

// New filter row types
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

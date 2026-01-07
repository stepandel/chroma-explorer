import { useState, useMemo } from 'react'
import { DocumentFilters, MetadataFilter, MetadataOperator } from '../types/filters'
import { SearchDocumentsParams } from '../../electron/types'

export interface UseDocumentFiltersReturn {
  filters: DocumentFilters
  setQueryText: (text: string) => void
  setNResults: (n: number) => void
  addMetadataFilter: (key: string, operator: MetadataOperator, value: string) => void
  removeMetadataFilter: (id: string) => void
  clearAllFilters: () => void
  hasActiveFilters: boolean
  buildSearchParams: (collectionName: string) => SearchDocumentsParams
}

const initialFilters: DocumentFilters = {
  queryText: '',
  nResults: 10,
  metadataFilters: [],
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function inferValueType(value: string, operator: MetadataOperator): any {
  // For $in and $nin operators, split by comma and infer type for each element
  if (operator === '$in' || operator === '$nin') {
    return value.split(',').map((v) => inferSingleValue(v.trim()))
  }

  return inferSingleValue(value)
}

function inferSingleValue(value: string): any {
  // Check for boolean
  if (value === 'true') return true
  if (value === 'false') return false

  // Check for number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value)
  }

  // Default to string
  return value
}

function buildWhereClause(metadataFilters: MetadataFilter[]): Record<string, any> | undefined {
  if (metadataFilters.length === 0) return undefined

  if (metadataFilters.length === 1) {
    const filter = metadataFilters[0]
    return {
      [filter.key]: {
        [filter.operator]: inferValueType(filter.value, filter.operator),
      },
    }
  }

  // Multiple filters - combine with $and
  return {
    $and: metadataFilters.map((filter) => ({
      [filter.key]: {
        [filter.operator]: inferValueType(filter.value, filter.operator),
      },
    })),
  }
}

export function useDocumentFilters(): UseDocumentFiltersReturn {
  const [filters, setFilters] = useState<DocumentFilters>(initialFilters)

  const setQueryText = (text: string) => {
    setFilters((prev) => ({ ...prev, queryText: text }))
  }

  const setNResults = (n: number) => {
    setFilters((prev) => ({ ...prev, nResults: n }))
  }

  const addMetadataFilter = (key: string, operator: MetadataOperator, value: string) => {
    if (!key.trim() || !value.trim()) return

    const newFilter: MetadataFilter = {
      id: generateId(),
      key: key.trim(),
      operator,
      value: value.trim(),
    }

    setFilters((prev) => ({
      ...prev,
      metadataFilters: [...prev.metadataFilters, newFilter],
    }))
  }

  const removeMetadataFilter = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      metadataFilters: prev.metadataFilters.filter((f) => f.id !== id),
    }))
  }

  const clearAllFilters = () => {
    setFilters(initialFilters)
  }

  const hasActiveFilters = useMemo(() => {
    return filters.queryText.trim() !== '' || filters.metadataFilters.length > 0
  }, [filters])

  const buildSearchParams = (collectionName: string): SearchDocumentsParams => {
    const params: SearchDocumentsParams = {
      collectionName,
    }

    // Add query text if present
    if (filters.queryText.trim() !== '') {
      params.queryText = filters.queryText.trim()
      params.nResults = filters.nResults
    }

    // Add metadata filter if present
    const whereClause = buildWhereClause(filters.metadataFilters)
    if (whereClause) {
      params.metadataFilter = whereClause
    }

    return params
  }

  return {
    filters,
    setQueryText,
    setNResults,
    addMetadataFilter,
    removeMetadataFilter,
    clearAllFilters,
    hasActiveFilters,
    buildSearchParams,
  }
}

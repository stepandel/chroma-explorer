import { useCallback, useEffect, useRef } from 'react'
import { QueryScope, QueryMetadataFilter } from '../../types/filters'
import { MetadataFilterRow } from './MetadataFilterRow'
import { formStyles } from '../../styles/form-controls'

const DEBOUNCE_SEARCH_MS = 300

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), ms)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

interface QueryToolbarProps {
  scope: QueryScope
  searchText: string
  idSearch: string
  nResults: number
  filters: QueryMetadataFilter[]
  availableFields: string[]
  fieldTypes: Record<string, 'string' | 'number' | 'boolean'>
  onScopeChange: (scope: QueryScope) => void
  onSearchTextChange: (text: string) => void
  onIdSearchChange: (id: string) => void
  onNResultsChange: (n: number) => void
  onFiltersChange: (filters: QueryMetadataFilter[]) => void
  onSearch: () => void
  error?: string | null
}

const inputClassName = formStyles.input
const selectClassName = formStyles.select
const buttonClassName = formStyles.button
const inputStyle = formStyles.inputShadow

export function QueryToolbar({
  scope,
  searchText,
  idSearch,
  nResults,
  filters,
  availableFields,
  fieldTypes,
  onScopeChange,
  onSearchTextChange,
  onIdSearchChange,
  onNResultsChange,
  onFiltersChange,
  onSearch,
  error,
}: QueryToolbarProps) {
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null)

  useEffect(() => {
    debouncedSearchRef.current = debounce(() => onSearch(), DEBOUNCE_SEARCH_MS)
    return () => {
      debouncedSearchRef.current?.cancel()
    }
  }, [onSearch])

  const triggerDebouncedSearch = useCallback(() => {
    debouncedSearchRef.current?.()
  }, [])

  const handleFilterChange = useCallback((id: string, updates: Partial<QueryMetadataFilter>) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f))
  }, [filters, onFiltersChange])

  const handleAddFilter = useCallback(() => {
    const newFilter: QueryMetadataFilter = {
      id: crypto.randomUUID(),
      field: availableFields[0] || '',
      operator: '$eq',
      value: '',
    }
    onFiltersChange([...filters, newFilter])
  }, [filters, availableFields, onFiltersChange])

  const handleRemoveFilter = useCallback((id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id))
  }, [filters, onFiltersChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      debouncedSearchRef.current?.cancel()
      onSearch()
    }
  }

  const handleSearchTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTextChange(e.target.value)
    triggerDebouncedSearch()
  }, [onSearchTextChange, triggerDebouncedSearch])

  const handleIdSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onIdSearchChange(e.target.value)
    triggerDebouncedSearch()
  }, [onIdSearchChange, triggerDebouncedSearch])

  const getScopeLabel = (s: QueryScope): string => {
    switch (s) {
      case 'query': return 'Query'
      case 'id': return 'ID'
    }
  }

  return (
    <div className="space-y-2" data-testid="query-toolbar">
      {/* Main query row */}
      <div className="flex gap-2 items-center w-full">
        <select
          aria-label="Search scope"
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as QueryScope)}
          className={`w-28 ${selectClassName}`}
          style={inputStyle}
          data-testid="scope-select"
        >
          <option value="query">{getScopeLabel('query')}</option>
          <option value="id">{getScopeLabel('id')}</option>
        </select>

        {scope === 'id' ? (
          <input
            type="text"
            aria-label="Document ID search"
            value={idSearch}
            onChange={handleIdSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Document ID..."
            className={`flex-1 ${inputClassName}`}
            style={inputStyle}
            data-testid="id-search-input"
          />
        ) : (
          <input
            type="text"
            aria-label="Document search query"
            value={searchText}
            onChange={handleSearchTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Search query..."
            className={`flex-1 ${inputClassName}`}
            style={inputStyle}
            data-testid="search-text-input"
          />
        )}

        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Limit:</span>
          <select
            aria-label="Result limit"
            value={nResults.toString()}
            onChange={(e) => onNResultsChange(parseInt(e.target.value, 10))}
            className={selectClassName}
            style={inputStyle}
            data-testid="limit-select"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="300">300</option>
            <option value="500">500</option>
            <option value="0">No limit</option>
          </select>
        </div>

        {filters.length === 0 && availableFields.length > 0 && (
          <button
            type="button"
            onClick={handleAddFilter}
            className={`${buttonClassName} text-muted-foreground`}
            data-testid="add-filter-button"
          >
            + Filter
          </button>
        )}
      </div>

      {error && (
        <div className="px-2 py-1.5 text-[11px] text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {filters.length > 0 && (
        <div className="space-y-2" data-testid="metadata-filters-container">
          {filters.map((filter, index) => (
            <MetadataFilterRow
              key={filter.id}
              filter={filter}
              availableFields={availableFields}
              fieldTypes={fieldTypes}
              onChange={handleFilterChange}
              onRemove={handleRemoveFilter}
              onAdd={handleAddFilter}
              onSearch={onSearch}
              isLast={index === filters.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

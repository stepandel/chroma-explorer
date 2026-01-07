import { FilterChip } from './FilterChip'
import { DocumentFilters } from '../types/filters'

interface ActiveFiltersDisplayProps {
  filters: DocumentFilters
  onRemoveQueryText: () => void
  onRemoveMetadataFilter: (id: string) => void
  onClearAll: () => void
}

export function ActiveFiltersDisplay({
  filters,
  onRemoveQueryText,
  onRemoveMetadataFilter,
  onClearAll,
}: ActiveFiltersDisplayProps) {
  const hasQueryText = filters.queryText.trim() !== ''
  const hasMetadataFilters = filters.metadataFilters.length > 0
  const hasAnyFilters = hasQueryText || hasMetadataFilters

  if (!hasAnyFilters) {
    return null
  }

  const totalFilters = (hasQueryText ? 1 : 0) + filters.metadataFilters.length

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Active Filters ({totalFilters}):
        </span>
        <button
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Clear All
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {hasQueryText && (
          <FilterChip
            type="query"
            label={`search: "${filters.queryText}"`}
            onRemove={onRemoveQueryText}
          />
        )}
        {filters.metadataFilters.map((filter) => (
          <FilterChip
            key={filter.id}
            type="metadata"
            label={`${filter.key} ${filter.operator} ${filter.value}`}
            onRemove={() => onRemoveMetadataFilter(filter.id)}
          />
        ))}
      </div>
    </div>
  )
}

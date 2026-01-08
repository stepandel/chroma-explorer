import { SemanticSearchInput } from './SemanticSearchInput'
import { MetadataFilterInput } from './MetadataFilterInput'
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay'
import { UseDocumentFiltersReturn } from '../hooks/useDocumentFilters'

interface FilterSectionProps {
  filterHook: UseDocumentFiltersReturn
}

export function FilterSection({ filterHook }: FilterSectionProps) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Filter Documents</h2>

      <div className="space-y-3">
        <SemanticSearchInput
          value={filterHook.filters.queryText}
          nResults={filterHook.filters.nResults}
          onChange={filterHook.setQueryText}
          onNResultsChange={filterHook.setNResults}
        />

        <MetadataFilterInput onAdd={filterHook.addMetadataFilter} />
      </div>

      <ActiveFiltersDisplay
        filters={filterHook.filters}
        onRemoveQueryText={() => filterHook.setQueryText('')}
        onRemoveMetadataFilter={filterHook.removeMetadataFilter}
        onClearAll={filterHook.clearAllFilters}
      />
    </div>
  )
}

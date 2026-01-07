import { SemanticSearchInput } from './SemanticSearchInput'
import { MetadataFilterInput } from './MetadataFilterInput'
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay'
import { UseDocumentFiltersReturn } from '../hooks/useDocumentFilters'

interface FilterSectionProps {
  filterHook: UseDocumentFiltersReturn
}

export function FilterSection({ filterHook }: FilterSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Documents</h2>

        <div className="space-y-4">
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
    </div>
  )
}

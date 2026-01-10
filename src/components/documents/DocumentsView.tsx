import { useMemo, useState, useEffect, useCallback } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useDocumentsQuery, useCollectionsQuery } from '../../hooks/useChromaQueries'
import DocumentsTable from './DocumentsTable'
import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'
import { EmbeddingFunctionSelector } from './EmbeddingFunctionSelector'
import { FilterRow } from '../filters/FilterRow'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsViewProps {
  collectionName: string
  selectedDocumentId: string | null
  onDocumentSelect: (id: string | null) => void
  onSelectedDocumentChange: (document: DocumentRecord | null) => void
}

function createDefaultFilterRow(): FilterRowType {
  return {
    id: crypto.randomUUID(),
    type: 'search',
    searchValue: '',
  }
}

export default function DocumentsView({
  collectionName,
  selectedDocumentId,
  onDocumentSelect,
  onSelectedDocumentChange,
}: DocumentsViewProps) {
  const { currentProfile } = useChromaDB()
  const [filterRows, setFilterRows] = useState<FilterRowType[]>([createDefaultFilterRow()])
  const [nResults, setNResults] = useState(10)

  // Fetch collections to get the current collection's info
  const { data: collections = [] } = useCollectionsQuery(currentProfile?.id || null)
  const currentCollection = collections.find(c => c.name === collectionName)

  // Embedding function override state
  const [embeddingOverride, setEmbeddingOverride] = useState<EmbeddingFunctionOverride | null>(null)

  // Fetch embedding override when collection changes
  useEffect(() => {
    const fetchOverride = async () => {
      if (!currentProfile?.id || !collectionName) return
      try {
        const override = await window.electronAPI.profiles.getEmbeddingOverride(
          currentProfile.id,
          collectionName
        )
        setEmbeddingOverride(override)
      } catch (err) {
        console.error('Failed to fetch embedding override:', err)
      }
    }
    fetchOverride()
  }, [currentProfile?.id, collectionName])

  const handleSaveOverride = useCallback(async (override: EmbeddingFunctionOverride) => {
    if (!currentProfile?.id) return
    await window.electronAPI.profiles.setEmbeddingOverride(
      currentProfile.id,
      collectionName,
      override
    )
    setEmbeddingOverride(override)
  }, [currentProfile?.id, collectionName])

  const handleClearOverride = useCallback(async () => {
    if (!currentProfile?.id) return
    await window.electronAPI.profiles.clearEmbeddingOverride(
      currentProfile.id,
      collectionName
    )
    setEmbeddingOverride(null)
  }, [currentProfile?.id, collectionName])

  // Reset filters when collection changes
  useEffect(() => {
    setFilterRows([createDefaultFilterRow()])
    setNResults(10)
  }, [collectionName])

  // Build search params from filter rows
  const searchParams = useMemo(() => {
    // Extract search query from search-type rows
    const searchRow = filterRows.find(r => r.type === 'search' && r.searchValue?.trim())
    const queryText = searchRow?.searchValue?.trim() || undefined

    // Helper to parse filter value based on operator
    const parseFilterValue = (value: string, operator: string): string | number | string[] | number[] => {
      const trimmed = value.trim()

      // Handle array operators ($in, $nin)
      if (operator === '$in' || operator === '$nin') {
        const items = trimmed.split(',').map(s => s.trim()).filter(Boolean)
        // Try to parse as numbers if all items are numeric
        const asNumbers = items.map(Number)
        if (asNumbers.every(n => !isNaN(n))) {
          return asNumbers
        }
        return items
      }

      // For comparison operators, try to parse as number
      if (['$gt', '$gte', '$lt', '$lte'].includes(operator)) {
        const num = Number(trimmed)
        if (!isNaN(num)) {
          return num
        }
      }

      // For equality operators, try number first, fall back to string
      if (operator === '$eq' || operator === '$ne') {
        const num = Number(trimmed)
        if (!isNaN(num) && trimmed !== '') {
          return num
        }
      }

      return trimmed
    }

    // Extract metadata filters from metadata-type rows
    const metadataRows = filterRows.filter(
      r => r.type === 'metadata' && r.metadataKey?.trim() && r.metadataValue?.trim()
    )
    const metadataFilter = metadataRows.length > 0
      ? metadataRows.reduce((acc, row) => ({
          ...acc,
          [row.metadataKey!]: {
            [row.operator || '$eq']: parseFilterValue(row.metadataValue!, row.operator || '$eq')
          },
        }), {})
      : undefined

    return {
      collectionName,
      queryText,
      nResults,
      metadataFilter,
    }
  }, [collectionName, filterRows, nResults])

  // Use React Query for documents with debouncing via staleTime
  const {
    data: documents = [],
    isLoading: loading,
    error,
  } = useDocumentsQuery(currentProfile?.id || null, searchParams)

  // Filter row handlers
  const handleFilterRowChange = useCallback((id: string, updates: Partial<FilterRowType>) => {
    setFilterRows(prev => prev.map(row =>
      row.id === id ? { ...row, ...updates } : row
    ))
  }, [])

  const handleAddFilterRow = useCallback(() => {
    setFilterRows(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'metadata',
      metadataKey: '',
      operator: '$eq' as MetadataOperator,
      metadataValue: '',
    }])
  }, [])

  const handleRemoveFilterRow = useCallback((id: string) => {
    setFilterRows(prev => {
      const filtered = prev.filter(row => row.id !== id)
      // Always keep at least one row
      return filtered.length > 0 ? filtered : [createDefaultFilterRow()]
    })
  }, [])

  const hasActiveFilters = filterRows.some(row =>
    (row.type === 'search' && row.searchValue?.trim()) ||
    (row.type === 'metadata' && row.metadataKey?.trim() && row.metadataValue?.trim())
  )

  // Extract unique metadata fields from documents
  const metadataFields = useMemo(() => {
    const fields = new Set<string>()
    documents.forEach(doc => {
      if (doc.metadata) {
        Object.keys(doc.metadata).forEach(key => fields.add(key))
      }
    })
    return Array.from(fields).sort()
  }, [documents])

  // Find selected document for drawer
  const selectedDocument = selectedDocumentId
    ? documents.find(doc => doc.id === selectedDocumentId)
    : null

  // Notify parent when selected document changes
  useEffect(() => {
    onSelectedDocumentChange(selectedDocument || null)
  }, [selectedDocument, onSelectedDocumentChange])

  return (
    <div className="flex flex-col h-full">
            {/* Row 1: Collection name and count */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">{collectionName}</h1>
                <EmbeddingFunctionSelector
                  collectionName={collectionName}
                  currentOverride={embeddingOverride}
                  serverConfig={currentCollection?.embeddingFunction || null}
                  onSave={handleSaveOverride}
                  onClear={handleClearOverride}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {!loading && !error && `${documents.length} record${documents.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Row 2: Filters */}
            <div className="px-4 py-2 border-b border-border space-y-2">
              {/* Filter rows */}
              {filterRows.map((row, index) => (
                <FilterRow
                  key={row.id}
                  row={row}
                  isFirst={index === 0}
                  isLast={index === filterRows.length - 1}
                  canRemove={filterRows.length > 1}
                  onChange={handleFilterRowChange}
                  onAdd={handleAddFilterRow}
                  onRemove={handleRemoveFilterRow}
                  nResults={nResults}
                  onNResultsChange={setNResults}
                  metadataFields={metadataFields}
                />
              ))}
            </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DocumentsTable
          documents={documents}
          loading={loading}
          error={error ? (error as Error).message : null}
          hasActiveFilters={hasActiveFilters}
          selectedDocumentId={selectedDocumentId}
          onDocumentSelect={onDocumentSelect}
        />
      </div>
    </div>
  )
}

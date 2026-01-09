import { useMemo, useState, useEffect, useCallback } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useDocumentsQuery, useCollectionsQuery } from '../../hooks/useChromaQueries'
import DocumentsTable from './DocumentsTable'
import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
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
  const [efSelectorOpen, setEfSelectorOpen] = useState(false)
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

    // Extract metadata filters from metadata-type rows
    const metadataRows = filterRows.filter(
      r => r.type === 'metadata' && r.metadataKey?.trim() && r.metadataValue?.trim()
    )
    const metadataFilter = metadataRows.length > 0
      ? metadataRows.reduce((acc, row) => ({
          ...acc,
          [row.metadataKey!]: { [row.operator || '$eq']: row.metadataValue },
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
                <button
                  onClick={() => setEfSelectorOpen(true)}
                  className={`text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                    embeddingOverride
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground bg-muted'
                  }`}
                  title={embeddingOverride ? 'Override active - Click to change' : 'Click to override embedding function'}
                >
                  {embeddingOverride
                    ? `${embeddingOverride.type}: ${embeddingOverride.modelName}`
                    : currentCollection?.embeddingFunction?.name || 'No EF configured'
                  }
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {!loading && !error && `${documents.length} record${documents.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Embedding Function Selector Dialog */}
            <EmbeddingFunctionSelector
              open={efSelectorOpen}
              onOpenChange={setEfSelectorOpen}
              collectionName={collectionName}
              profileId={currentProfile?.id || ''}
              currentOverride={embeddingOverride}
              serverConfig={currentCollection?.embeddingFunction || null}
              onSave={handleSaveOverride}
              onClear={handleClearOverride}
            />

            {/* Row 2: Filters */}
            <div className="px-4 py-2 border-b border-border space-y-2">
              {/* Filter rows */}
              {filterRows.map((row, index) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <FilterRow
                    row={row}
                    isFirst={index === 0}
                    isLast={index === filterRows.length - 1}
                    canRemove={filterRows.length > 1}
                    onChange={handleFilterRowChange}
                    onAdd={handleAddFilterRow}
                    onRemove={handleRemoveFilterRow}
                  />
                  {/* Limit selector - only show on first row */}
                  {index === 0 && (
                    <Select
                      value={nResults.toString()}
                      onValueChange={(value) => setNResults(parseInt(value, 10))}
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
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

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useDocumentsQuery, useCollectionsQuery } from '../../hooks/useChromaQueries'
import DocumentsTable from './DocumentsTable'
import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

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

function getDefaultFilters(): DocumentFilters {
  return {
    queryText: '',
    nResults: 10,
    metadataFilters: [],
  }
}

export default function DocumentsView({
  collectionName,
  selectedDocumentId,
  onDocumentSelect,
  onSelectedDocumentChange,
}: DocumentsViewProps) {
  const { currentProfile } = useChromaDB()
  const [filters, setFilters] = useState<DocumentFilters>(getDefaultFilters())

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
    setFilters(getDefaultFilters())
    setMetaKey('')
    setMetaValue('')
  }, [collectionName])

  // Build search params
  const searchParams = useMemo(() => ({
    collectionName,
    queryText: filters.queryText || undefined,
    nResults: filters.nResults,
    metadataFilter: filters.metadataFilters.length > 0
      ? filters.metadataFilters.reduce((acc, filter) => ({
          ...acc,
          [filter.key]: { [filter.operator]: filter.value },
        }), {})
      : undefined,
  }), [collectionName, filters])

  // Use React Query for documents with debouncing via staleTime
  const {
    data: documents = [],
    isLoading: loading,
    error,
  } = useDocumentsQuery(currentProfile?.id || null, searchParams)

  // Create a hook-compatible interface for FilterSection
  const filterHook = useMemo(() => ({
    filters,
    hasActiveFilters: filters.queryText.trim() !== '' || filters.metadataFilters.length > 0,

    setQueryText: (queryText: string) => {
      setFilters(prev => ({ ...prev, queryText }))
    },

    setNResults: (nResults: number) => {
      setFilters(prev => ({ ...prev, nResults }))
    },

    addMetadataFilter: (key: string, operator: any, value: string) => {
      const newFilter: MetadataFilter = {
        id: crypto.randomUUID(),
        key,
        operator,
        value,
      }
      setFilters(prev => ({
        ...prev,
        metadataFilters: [...prev.metadataFilters, newFilter],
      }))
    },

    removeMetadataFilter: (id: string) => {
      setFilters(prev => ({
        ...prev,
        metadataFilters: prev.metadataFilters.filter(f => f.id !== id),
      }))
    },

    clearAllFilters: () => {
      setFilters(getDefaultFilters())
    },

    buildSearchParams: () => searchParams,
  }), [filters, searchParams])

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

                {/* Metadata filter */}
                <Input
                  type="text"
                  placeholder="Filter key"
                  value={metaKey}
                  onChange={(e) => setMetaKey(e.target.value)}
                  className="w-28 h-8 text-xs"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && metaKey.trim() && metaValue.trim()) {
                      filterHook.addMetadataFilter(metaKey.trim(), '$eq', metaValue.trim())
                      setMetaKey('')
                      setMetaValue('')
                    }
                  }}
                />
                <Input
                  type="text"
                  placeholder="Filter value"
                  value={metaValue}
                  onChange={(e) => setMetaValue(e.target.value)}
                  className="w-28 h-8 text-xs"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && metaKey.trim() && metaValue.trim()) {
                      filterHook.addMetadataFilter(metaKey.trim(), '$eq', metaValue.trim())
                      setMetaKey('')
                      setMetaValue('')
                    }
                  }}
                />

                {/* Limit selector */}
                <Select
                  value={filterHook.filters.nResults.toString()}
                  onValueChange={(value) => filterHook.setNResults(parseInt(value, 10))}
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
              </div>

              {/* Active filters display */}
              {filterHook.hasActiveFilters && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {filterHook.filters.queryText && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                      Search: {filterHook.filters.queryText}
                      <button
                        onClick={() => filterHook.setQueryText('')}
                        className="hover:text-primary/80"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {filterHook.filters.metadataFilters.map(filter => (
                    <span
                      key={filter.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                    >
                      {filter.key} {filter.operator} {filter.value}
                      <button
                        onClick={() => filterHook.removeMetadataFilter(filter.id)}
                        className="hover:text-primary/80"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={filterHook.clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DocumentsTable
          documents={documents}
          loading={loading}
          error={error ? (error as Error).message : null}
          hasActiveFilters={filterHook.hasActiveFilters}
          selectedDocumentId={selectedDocumentId}
          onDocumentSelect={onDocumentSelect}
        />
      </div>
    </div>
  )
}

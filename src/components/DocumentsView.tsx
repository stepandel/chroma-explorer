import { useMemo, useState, useEffect } from 'react'
import { useChromaDB } from '../providers/ChromaDBProvider'
import { useDocumentsQuery } from '../hooks/useChromaQueries'
import DocumentsTable from './DocumentsTable'
import DocumentDetailPanel from './DocumentDetailPanel'
import { MetadataFilter, DocumentFilters } from '../types/filters'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Panel, Group, Separator } from 'react-resizable-panels'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsViewProps {
  collectionName: string
  selectedDocumentId: string | null
  onDocumentSelect: (id: string) => void
  rightDrawerOpen: boolean
  onCloseRightDrawer: () => void
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
  rightDrawerOpen,
  onCloseRightDrawer,
}: DocumentsViewProps) {
  const { currentProfile } = useChromaDB()
  const [filters, setFilters] = useState<DocumentFilters>(getDefaultFilters())
  const [metaKey, setMetaKey] = useState('')
  const [metaValue, setMetaValue] = useState('')

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

  return (
    <div className="flex h-full">
      <Group orientation="horizontal">
        {/* Left Panel: Filters and Table */}
        <Panel defaultSize={rightDrawerOpen && selectedDocument ? "70" : "100"} minSize="40">
          <div className="flex flex-col min-w-0 h-full">
            {/* Row 1: Collection name and count */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <h1 className="text-lg font-semibold text-foreground">{collectionName}</h1>
              <span className="text-xs text-muted-foreground">
                {!loading && !error && `${documents.length} record${documents.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Row 2: Search, filters, and limit */}
            <div className="px-4 py-2 border-b border-border">
              <div className="flex gap-2 items-center">
                {/* Search input */}
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    value={filterHook.filters.queryText}
                    onChange={(e) => filterHook.setQueryText(e.target.value)}
                    placeholder="Search..."
                    className="w-full pr-8 h-8 text-xs"
                  />
                  {filterHook.filters.queryText && (
                    <Button
                      onClick={() => filterHook.setQueryText('')}
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </Button>
                  )}
                </div>

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
        </Panel>

        {/* Resize Handle - only when drawer is open */}
        {rightDrawerOpen && selectedDocument && (
          <>
            <Separator className="w-1 bg-border hover:bg-primary active:bg-primary transition-colors duration-150 cursor-col-resize" />

            {/* Right Panel: Document Detail Drawer */}
            <Panel
              defaultSize="30"
              minSize="20"
              maxSize="50"
              collapsible={true}
            >
              <div className="h-full overflow-y-auto bg-background border-l border-border">
                <DocumentDetailPanel document={selectedDocument} />
              </div>
            </Panel>
          </>
        )}
      </Group>
    </div>
  )
}

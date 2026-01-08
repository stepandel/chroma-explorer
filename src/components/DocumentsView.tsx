import { useMemo, useState } from 'react'
import { useChromaDB } from '../providers/ChromaDBProvider'
import { useDocumentsQuery } from '../hooks/useChromaQueries'
import DocumentsTable from './DocumentsTable'
import { FilterSection } from './FilterSection'
import { MetadataFilter, DocumentFilters } from '../types/filters'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsViewProps {
  collectionName: string
}

function getDefaultFilters(): DocumentFilters {
  return {
    queryText: '',
    nResults: 10,
    metadataFilters: [],
  }
}

export default function DocumentsView({ collectionName }: DocumentsViewProps) {
  const { currentProfile } = useChromaDB()
  const [filters, setFilters] = useState<DocumentFilters>(getDefaultFilters())

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

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">{collectionName}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {!loading && !error && `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="px-6 py-4 border-b border-border">
        <FilterSection filterHook={filterHook} />
      </div>

      <div className="flex-1 overflow-auto">
        <DocumentsTable
          documents={documents}
          loading={loading}
          error={error ? (error as Error).message : null}
          hasActiveFilters={filterHook.hasActiveFilters}
        />
      </div>
    </div>
  )
}

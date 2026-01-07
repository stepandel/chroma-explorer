import { useState, useEffect, useMemo } from 'react'
import { useChromaDB } from '../providers/ChromaDBProvider'
import { useTabs } from '../context/TabsContext'
import DocumentsTable from './DocumentsTable'
import { FilterSection } from './FilterSection'
import { MetadataFilter } from '../types/filters'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsViewProps {
  collectionName: string
}

export default function DocumentsView({ collectionName }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { searchDocuments } = useChromaDB()
  const { activeTab, updateTabFilters } = useTabs()

  if (!activeTab) {
    return null
  }

  const filters = activeTab.filters

  // Create a hook-compatible interface for FilterSection
  const filterHook = useMemo(() => ({
    filters,
    hasActiveFilters: filters.queryText.trim() !== '' || filters.metadataFilters.length > 0,

    setQueryText: (queryText: string) => {
      updateTabFilters(activeTab.id, { ...filters, queryText })
    },

    setNResults: (nResults: number) => {
      updateTabFilters(activeTab.id, { ...filters, nResults })
    },

    addMetadataFilter: (key: string, operator: any, value: string) => {
      const newFilter: MetadataFilter = {
        id: crypto.randomUUID(),
        key,
        operator,
        value,
      }
      updateTabFilters(activeTab.id, {
        ...filters,
        metadataFilters: [...filters.metadataFilters, newFilter],
      })
    },

    removeMetadataFilter: (id: string) => {
      updateTabFilters(activeTab.id, {
        ...filters,
        metadataFilters: filters.metadataFilters.filter(f => f.id !== id),
      })
    },

    clearAllFilters: () => {
      updateTabFilters(activeTab.id, {
        queryText: '',
        nResults: 10,
        metadataFilters: [],
      })
    },

    buildSearchParams: () => ({
      collectionName,
      queryText: filters.queryText || undefined,
      nResults: filters.nResults,
      metadataFilter: filters.metadataFilters.length > 0
        ? filters.metadataFilters.reduce((acc, filter) => ({
            ...acc,
            [filter.key]: { [filter.operator]: filter.value },
          }), {})
        : undefined,
    }),
  }), [filters, activeTab.id, collectionName, updateTabFilters])

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true)
      setError(null)

      try {
        const params = filterHook.buildSearchParams()
        const docs = await searchDocuments(params)
        setDocuments(docs)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents'
        setError(errorMessage)
        console.error('Error fetching documents:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce for query text to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      fetchDocuments()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [collectionName, filters, searchDocuments])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{collectionName}</h1>
        <p className="text-gray-600 text-sm mt-1">
          {!loading && !error && `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <FilterSection filterHook={filterHook} />

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Documents</h2>
        </div>
        <DocumentsTable
          documents={documents}
          loading={loading}
          error={error}
          hasActiveFilters={filterHook.hasActiveFilters}
        />
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import DocumentsTable from './DocumentsTable'
import { FilterSection } from './FilterSection'
import { useDocumentFilters } from '../hooks/useDocumentFilters'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsViewProps {
  collectionName: string
  onBack: () => void
}

export default function DocumentsView({ collectionName, onBack }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterHook = useDocumentFilters()

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true)
      setError(null)

      try {
        if (!window.electronAPI || !window.electronAPI.chromadb) {
          throw new Error('Electron API not available')
        }

        // Build search params from filters
        const params = filterHook.buildSearchParams(collectionName)

        // Use searchDocuments instead of getDocuments
        const docs = await window.electronAPI.chromadb.searchDocuments(params)
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
  }, [collectionName, filterHook.filters])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Collections
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{collectionName}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {!loading && !error && `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
        </div>
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

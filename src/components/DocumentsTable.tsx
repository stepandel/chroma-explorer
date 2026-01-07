import { useState } from 'react'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsTableProps {
  documents: DocumentRecord[]
  loading: boolean
  error: string | null
  hasActiveFilters?: boolean
}

function EmbeddingCell({ embedding }: { embedding: number[] | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!embedding) {
    return <span className="text-gray-400 italic">No embedding</span>
  }

  const previewCount = 5
  const hasMore = embedding.length > previewCount

  if (expanded) {
    return (
      <div className="space-y-2">
        <div className="text-xs bg-gray-50 p-2 rounded font-mono max-h-40 overflow-y-auto">
          [{embedding.join(', ')}]
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Show less
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono">
        [{embedding.slice(0, previewCount).join(', ')}
        {hasMore && '...'}]
      </span>
      {hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          +{embedding.length - previewCount} more
        </button>
      )}
    </div>
  )
}

export default function DocumentsTable({
  documents,
  loading,
  error,
  hasActiveFilters = false,
}: DocumentsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">
          {hasActiveFilters ? 'Searching documents...' : 'Loading documents...'}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <h3 className="text-gray-700 font-semibold text-lg mb-2">No Documents Found</h3>
          <p className="text-gray-500">
            {hasActiveFilters
              ? 'No documents match your filters. Try adjusting your search criteria.'
              : "This collection doesn't have any documents yet."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Metadata
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Embedding
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-mono text-gray-900 align-top">
                {doc.id}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-md align-top">
                {doc.document || <span className="text-gray-400 italic">No document</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 align-top">
                {doc.metadata ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-xs">
                    {JSON.stringify(doc.metadata, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-400 italic">No metadata</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 align-top">
                <EmbeddingCell embedding={doc.embedding} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

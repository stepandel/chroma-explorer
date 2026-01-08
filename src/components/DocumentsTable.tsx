import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    return <span className="text-muted-foreground italic">No embedding</span>
  }

  const previewCount = 5
  const hasMore = embedding.length > previewCount

  if (expanded) {
    return (
      <div className="space-y-2">
        <div className="text-xs bg-secondary p-2 rounded-lg font-mono max-h-40 overflow-y-auto">
          [{embedding.join(', ')}]
        </div>
        <Button
          onClick={() => setExpanded(false)}
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
        >
          Show less
        </Button>
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
        <Button
          onClick={() => setExpanded(true)}
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs whitespace-nowrap"
        >
          +{embedding.length - previewCount} more
        </Button>
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
  // Extract all unique metadata keys from documents
  const metadataKeys = Array.from(
    new Set(
      documents.flatMap(doc =>
        doc.metadata ? Object.keys(doc.metadata) : []
      )
    )
  ).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">
          {hasActiveFilters ? 'Searching documents...' : 'Loading documents...'}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <h3 className="text-destructive font-semibold mb-2">Error</h3>
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <h3 className="text-foreground font-semibold text-lg mb-2">No Documents Found</h3>
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? 'No documents match your filters. Try adjusting your search criteria.'
              : "This collection doesn't have any documents yet."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full">
        <thead className="bg-secondary sticky top-0 z-10 border-b border-border">
          <tr>
            <th className="px-3 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              ID
            </th>
            <th className="px-3 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Document
            </th>
            {metadataKeys.map(key => (
              <th key={key} className="px-3 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background divide-y divide-border">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-secondary/30 transition-colors">
              <td className="px-3 py-0.5 text-xs font-mono text-foreground align-top">
                {doc.id}
              </td>
              <td className="px-3 py-0.5 text-xs text-foreground max-w-md align-top">
                <div className="line-clamp-2">
                  {doc.document || <span className="text-muted-foreground italic">No document</span>}
                </div>
              </td>
              {metadataKeys.map(key => {
                const value = doc.metadata?.[key]
                return (
                  <td key={key} className="px-3 py-0.5 text-xs text-foreground max-w-md align-top">
                    {value !== undefined && value !== null ? (
                      typeof value === 'object' ? (
                        <pre className="text-xs bg-secondary/50 p-1 rounded overflow-x-auto line-clamp-2">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <div className="line-clamp-2">
                          {String(value)}
                        </div>
                      )
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

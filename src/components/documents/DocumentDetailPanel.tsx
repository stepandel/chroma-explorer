import EmbeddingCell from './EmbeddingCell'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentDetailPanelProps {
  document: DocumentRecord
}

export default function DocumentDetailPanel({ document }: DocumentDetailPanelProps) {
  return (
    <div className="h-full overflow-auto space-y-3 p-3">
      {/* ID Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">id</h3>
        <div className="p-2 bg-secondary/50 rounded border border-border">
          <code className="text-xs font-mono break-all">{document.id}</code>
        </div>
      </section>

      {/* Document Text Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">document</h3>
        <div className="p-2 bg-secondary/50 rounded border border-border">
          {document.document ? (
            <p className="text-xs whitespace-pre-wrap">{document.document}</p>
          ) : (
            <span className="text-muted-foreground italic text-xs">No document</span>
          )}
        </div>
      </section>

      {/* Metadata Fields - Each as Individual Section */}
      {document.metadata && Object.entries(document.metadata).map(([key, value]) => (
        <section key={key}>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">{key}</h3>
          <div className="p-2 bg-secondary/50 rounded border border-border">
            {typeof value === 'object' && value !== null ? (
              <pre className="text-xs font-mono overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              <span className="text-xs">{String(value)}</span>
            )}
          </div>
        </section>
      ))}

      {/* Embedding Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">embedding</h3>
        <div className="p-2 bg-secondary/50 rounded border border-border">
          <EmbeddingCell embedding={document.embedding} />
        </div>
      </section>
    </div>
  )
}

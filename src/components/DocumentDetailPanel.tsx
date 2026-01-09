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
    <div className="space-y-6">
      {/* ID Section */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">ID</h3>
        <div className="p-3 bg-secondary/50 rounded-lg">
          <code className="text-sm font-mono break-all">{document.id}</code>
        </div>
      </section>

      {/* Document Text Section */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Document</h3>
        <div className="p-3 bg-secondary/50 rounded-lg">
          {document.document ? (
            <p className="text-sm whitespace-pre-wrap">{document.document}</p>
          ) : (
            <span className="text-muted-foreground italic text-sm">No document</span>
          )}
        </div>
      </section>

      {/* Metadata Section */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Metadata</h3>
        <div className="p-3 bg-secondary/50 rounded-lg">
          {document.metadata && Object.keys(document.metadata).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(document.metadata).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground">{key}</span>
                  <div className="pl-3">
                    {typeof value === 'object' && value !== null ? (
                      <pre className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-sm">{String(value)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic text-sm">No metadata</span>
          )}
        </div>
      </section>

      {/* Embedding Section */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Embedding</h3>
        <div className="p-3 bg-secondary/50 rounded-lg">
          <EmbeddingCell embedding={document.embedding} />
        </div>
      </section>
    </div>
  )
}

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
    <div className="space-y-3 p-3">
      {/* ID Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">ID</h3>
        <div className="p-2 bg-secondary/50 rounded">
          <code className="text-xs font-mono break-all">{document.id}</code>
        </div>
      </section>

      {/* Document Text Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">Document</h3>
        <div className="p-2 bg-secondary/50 rounded">
          {document.document ? (
            <p className="text-xs whitespace-pre-wrap">{document.document}</p>
          ) : (
            <span className="text-muted-foreground italic text-xs">No document</span>
          )}
        </div>
      </section>

      {/* Metadata Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">Metadata</h3>
        <div className="p-2 bg-secondary/50 rounded">
          {document.metadata && Object.keys(document.metadata).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(document.metadata).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">{key}</span>
                  <div className="pl-2">
                    {typeof value === 'object' && value !== null ? (
                      <pre className="text-xs font-mono bg-background p-1.5 rounded overflow-x-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-xs">{String(value)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic text-xs">No metadata</span>
          )}
        </div>
      </section>

      {/* Embedding Section */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">Embedding</h3>
        <div className="p-2 bg-secondary/50 rounded">
          <EmbeddingCell embedding={document.embedding} />
        </div>
      </section>
    </div>
  )
}

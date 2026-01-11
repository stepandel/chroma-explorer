import { useState, useEffect } from 'react'
import EmbeddingCell from './EmbeddingCell'
import { RegenerateEmbeddingDialog } from './RegenerateEmbeddingDialog'
import { useUpdateDocumentMutation } from '../../hooks/useChromaQueries'
import { Button } from '@/components/ui/button'
import { Metadata } from 'chromadb'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentDetailPanelProps {
  document: DocumentRecord
  collectionName: string
  profileId: string
}

type EditingField = 'document' | 'embedding' | `metadata:${string}` | null

export default function DocumentDetailPanel({
  document,
  collectionName,
  profileId,
}: DocumentDetailPanelProps) {
  // Editing state
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [draftDocument, setDraftDocument] = useState(document.document)
  const [draftMetadata, setDraftMetadata] = useState(document.metadata)
  const [draftEmbedding, setDraftEmbedding] = useState<string>('')
  const [embeddingError, setEmbeddingError] = useState<string | null>(null)

  // Regenerate embedding dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [pendingDocumentUpdate, setPendingDocumentUpdate] = useState<string | null>(null)

  // Update mutation
  const updateMutation = useUpdateDocumentMutation(profileId, collectionName)

  // Reset drafts when document changes
  useEffect(() => {
    setDraftDocument(document.document)
    setDraftMetadata(document.metadata)
    setDraftEmbedding(document.embedding ? JSON.stringify(document.embedding) : '')
    setEditingField(null)
    setEmbeddingError(null)
  }, [document.id, document.document, document.metadata, document.embedding])

  // Handle cancel
  const handleCancel = () => {
    setEditingField(null)
    setDraftDocument(document.document)
    setDraftMetadata(document.metadata)
    setDraftEmbedding(document.embedding ? JSON.stringify(document.embedding) : '')
    setEmbeddingError(null)
  }

  // Handle document save - shows dialog if text changed
  const handleSaveDocument = () => {
    if (draftDocument !== document.document) {
      setPendingDocumentUpdate(draftDocument)
      setShowRegenerateDialog(true)
    } else {
      setEditingField(null)
    }
  }

  // Handle regenerate dialog response
  const handleRegenerateConfirm = async (regenerate: boolean) => {
    try {
      await updateMutation.mutateAsync({
        documentId: document.id,
        document: pendingDocumentUpdate ?? undefined,
        regenerateEmbedding: regenerate,
      })
      setShowRegenerateDialog(false)
      setPendingDocumentUpdate(null)
      setEditingField(null)
    } catch (error) {
      console.error('Failed to update document:', error)
    }
  }

  // Handle metadata save
  const handleSaveMetadata = async (key: string) => {
    if (!draftMetadata) return

    const newValue = draftMetadata[key]
    const originalValue = document.metadata?.[key]

    // Only update if value changed
    if (newValue !== originalValue) {
      try {
        await updateMutation.mutateAsync({
          documentId: document.id,
          metadata: draftMetadata as Metadata,
        })
        setEditingField(null)
      } catch (error) {
        console.error('Failed to update metadata:', error)
      }
    } else {
      setEditingField(null)
    }
  }

  // Handle metadata value change
  const handleMetadataChange = (key: string, value: string) => {
    if (!draftMetadata) return

    // Try to preserve original type
    const originalValue = document.metadata?.[key]
    let parsedValue: unknown = value

    if (typeof originalValue === 'number') {
      const num = Number(value)
      if (!isNaN(num)) {
        parsedValue = num
      }
    } else if (typeof originalValue === 'boolean') {
      if (value.toLowerCase() === 'true') parsedValue = true
      else if (value.toLowerCase() === 'false') parsedValue = false
    }

    setDraftMetadata({ ...draftMetadata, [key]: parsedValue })
  }

  // Handle embedding save
  const handleSaveEmbedding = async () => {
    // Validate embedding
    try {
      const parsed = JSON.parse(draftEmbedding)
      if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === 'number')) {
        setEmbeddingError('Embedding must be an array of numbers')
        return
      }

      await updateMutation.mutateAsync({
        documentId: document.id,
        embedding: parsed,
      })
      setEditingField(null)
      setEmbeddingError(null)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setEmbeddingError('Invalid JSON format')
      } else {
        console.error('Failed to update embedding:', e)
      }
    }
  }

  // Handle embedding click to edit
  const handleEmbeddingEditStart = () => {
    setDraftEmbedding(
      document.embedding ? JSON.stringify(document.embedding, null, 2) : '[]'
    )
    setEditingField('embedding')
  }

  const isEditing = editingField !== null
  const isPending = updateMutation.isPending

  return (
    <div className="h-full overflow-auto space-y-3 p-3">
      {/* ID Section - Not editable */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">id</h3>
        <div className="p-2 bg-secondary/50 rounded border border-border">
          <code className="text-xs font-mono break-all">{document.id}</code>
        </div>
      </section>

      {/* Document Text Section */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-muted-foreground">document</h3>
          {editingField === 'document' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDocument}
                disabled={isPending}
                className="h-6 px-2 text-xs"
              >
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        {editingField === 'document' ? (
          <textarea
            value={draftDocument ?? ''}
            onChange={(e) => setDraftDocument(e.target.value)}
            className="w-full min-h-[100px] p-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('document')}
            className="p-2 bg-secondary/50 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
          >
            {document.document ? (
              <p className="text-xs whitespace-pre-wrap">{document.document}</p>
            ) : (
              <span className="text-muted-foreground italic text-xs">
                No document - click to add
              </span>
            )}
          </div>
        )}
      </section>

      {/* Metadata Fields - Each as Individual Section */}
      {document.metadata &&
        Object.entries(document.metadata).map(([key, value]) => {
          const fieldId = `metadata:${key}` as const
          const isEditingThisField = editingField === fieldId

          return (
            <section key={key}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-muted-foreground">{key}</h3>
                {isEditingThisField && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={isPending}
                      className="h-6 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveMetadata(key)}
                      disabled={isPending}
                      className="h-6 px-2 text-xs"
                    >
                      {isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {isEditingThisField ? (
                <input
                  type="text"
                  value={
                    draftMetadata?.[key] !== undefined
                      ? typeof draftMetadata[key] === 'object'
                        ? JSON.stringify(draftMetadata[key])
                        : String(draftMetadata[key])
                      : ''
                  }
                  onChange={(e) => handleMetadataChange(key, e.target.value)}
                  className="w-full p-2 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => setEditingField(fieldId)}
                  className="p-2 bg-secondary/50 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {typeof value === 'object' && value !== null ? (
                    <pre className="text-xs font-mono overflow-x-auto">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-xs">{String(value)}</span>
                  )}
                </div>
              )}
            </section>
          )
        })}

      {/* Embedding Section */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-muted-foreground">embedding</h3>
          {editingField === 'embedding' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEmbedding}
                disabled={isPending}
                className="h-6 px-2 text-xs"
              >
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        {editingField === 'embedding' ? (
          <div className="space-y-2">
            <textarea
              value={draftEmbedding}
              onChange={(e) => {
                setDraftEmbedding(e.target.value)
                setEmbeddingError(null)
              }}
              className="w-full min-h-[200px] p-2 text-xs font-mono rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              autoFocus
            />
            {embeddingError && (
              <p className="text-xs text-destructive">{embeddingError}</p>
            )}
          </div>
        ) : (
          <div
            onClick={handleEmbeddingEditStart}
            className="p-2 bg-secondary/50 rounded border border-border cursor-pointer hover:border-primary/50 transition-colors"
          >
            <EmbeddingCell embedding={document.embedding} />
          </div>
        )}
      </section>

      {/* Regenerate Embedding Dialog */}
      <RegenerateEmbeddingDialog
        open={showRegenerateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowRegenerateDialog(false)
            setPendingDocumentUpdate(null)
          }
        }}
        onConfirm={handleRegenerateConfirm}
        isLoading={isPending}
      />
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import EmbeddingCell from './EmbeddingCell'
import { RegenerateEmbeddingDialog } from './RegenerateEmbeddingDialog'
import { useUpdateDocumentMutation } from '../../hooks/useChromaQueries'
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

  // Refs for textareas to auto-resize
  const documentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const embeddingTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea to fit content
  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  // Auto-resize on content change
  useEffect(() => {
    if (editingField === 'document') {
      autoResize(documentTextareaRef.current)
    }
  }, [draftDocument, editingField])

  useEffect(() => {
    if (editingField === 'embedding') {
      autoResize(embeddingTextareaRef.current)
    }
  }, [draftEmbedding, editingField])

  // Regenerate embedding dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)

  // Update mutation
  const updateMutation = useUpdateDocumentMutation(profileId, collectionName)

  // Check if there are unsaved changes
  const hasDocumentChanges = draftDocument !== document.document
  const hasMetadataChanges = JSON.stringify(draftMetadata) !== JSON.stringify(document.metadata)
  const hasEmbeddingChanges = (() => {
    if (!draftEmbedding && !document.embedding) return false
    if (!draftEmbedding || !document.embedding) return true
    try {
      const parsed = JSON.parse(draftEmbedding)
      return JSON.stringify(parsed) !== JSON.stringify(document.embedding)
    } catch {
      return true
    }
  })()
  const hasDirtyChanges = hasDocumentChanges || hasMetadataChanges || hasEmbeddingChanges

  // Reset drafts when document changes
  useEffect(() => {
    setDraftDocument(document.document)
    setDraftMetadata(document.metadata)
    setDraftEmbedding(document.embedding ? JSON.stringify(document.embedding) : '')
    setEditingField(null)
    setEmbeddingError(null)
  }, [document.id, document.document, document.metadata, document.embedding])

  // Handle cancel/revert all changes
  const handleCancel = useCallback(() => {
    setEditingField(null)
    setDraftDocument(document.document)
    setDraftMetadata(document.metadata)
    setDraftEmbedding(document.embedding ? JSON.stringify(document.embedding) : '')
    setEmbeddingError(null)
  }, [document.document, document.metadata, document.embedding])

  // Handle save all changes
  const handleSave = useCallback(async () => {
    // If document changed, show regenerate dialog
    if (hasDocumentChanges) {
      setShowRegenerateDialog(true)
      return
    }

    // Otherwise save metadata and/or embedding changes
    try {
      const updates: {
        documentId: string
        metadata?: Metadata
        embedding?: number[]
      } = { documentId: document.id }

      if (hasMetadataChanges && draftMetadata) {
        updates.metadata = draftMetadata as Metadata
      }

      if (hasEmbeddingChanges && draftEmbedding) {
        const parsed = JSON.parse(draftEmbedding)
        if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === 'number')) {
          setEmbeddingError('Embedding must be an array of numbers')
          return
        }
        updates.embedding = parsed
      }

      if (hasMetadataChanges || hasEmbeddingChanges) {
        await updateMutation.mutateAsync(updates)
      }
      setEditingField(null)
      setEmbeddingError(null)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setEmbeddingError('Invalid JSON format')
      } else {
        console.error('Failed to save changes:', e)
      }
    }
  }, [
    document.id,
    hasDocumentChanges,
    hasMetadataChanges,
    hasEmbeddingChanges,
    draftMetadata,
    draftEmbedding,
    updateMutation,
  ])

  // Handle regenerate dialog response
  const handleRegenerateConfirm = async (regenerate: boolean) => {
    try {
      const updates: {
        documentId: string
        document?: string
        metadata?: Metadata
        embedding?: number[]
        regenerateEmbedding?: boolean
      } = {
        documentId: document.id,
        document: draftDocument ?? undefined,
        regenerateEmbedding: regenerate,
      }

      // Include metadata changes if any
      if (hasMetadataChanges && draftMetadata) {
        updates.metadata = draftMetadata as Metadata
      }

      // Include embedding changes if not regenerating and has changes
      if (!regenerate && hasEmbeddingChanges && draftEmbedding) {
        try {
          const parsed = JSON.parse(draftEmbedding)
          if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
            updates.embedding = parsed
          }
        } catch {
          // Ignore invalid embedding when saving with document
        }
      }

      await updateMutation.mutateAsync(updates)
      setShowRegenerateDialog(false)
      setEditingField(null)
      setEmbeddingError(null)
    } catch (error) {
      console.error('Failed to update document:', error)
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

  // Handle embedding click to edit
  const handleEmbeddingEditStart = () => {
    setDraftEmbedding(
      document.embedding ? JSON.stringify(document.embedding, null, 2) : '[]'
    )
    setEditingField('embedding')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+S to save
      if (e.metaKey && e.key === 's') {
        e.preventDefault()
        if (hasDirtyChanges) {
          handleSave()
        }
      }
      // Command+Z to cancel/revert (only when we have changes)
      if (e.metaKey && e.key === 'z' && !e.shiftKey && hasDirtyChanges) {
        e.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasDirtyChanges, handleSave, handleCancel])

  const isPending = updateMutation.isPending

  // Common field styling
  const fieldBaseStyle = 'p-2 bg-secondary/50 rounded border transition-colors'
  const getFieldStyle = (isEditing: boolean, isDirty: boolean) => {
    if (isEditing) {
      return `${fieldBaseStyle} border-blue-500/50 ring-1 ring-blue-500/30`
    }
    if (isDirty) {
      return `${fieldBaseStyle} border-blue-500/30`
    }
    return `${fieldBaseStyle} border-border hover:border-primary/50 cursor-pointer`
  }

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
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">document</h3>
        {editingField === 'document' ? (
          <textarea
            ref={documentTextareaRef}
            value={draftDocument ?? ''}
            onChange={(e) => setDraftDocument(e.target.value)}
            onBlur={() => setEditingField(null)}
            className={`w-full text-xs whitespace-pre-wrap overflow-hidden focus:outline-none ${getFieldStyle(true, hasDocumentChanges)}`}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('document')}
            className={getFieldStyle(false, hasDocumentChanges)}
          >
            {draftDocument ? (
              <p className="text-xs whitespace-pre-wrap">{draftDocument}</p>
            ) : (
              <span className="text-muted-foreground italic text-xs">
                No document - click to add
              </span>
            )}
          </div>
        )}
      </section>

      {/* Metadata Fields - Each as Individual Section */}
      {draftMetadata &&
        Object.entries(draftMetadata).map(([key, value]) => {
          const fieldId = `metadata:${key}` as const
          const isEditingThisField = editingField === fieldId
          const originalValue = document.metadata?.[key]
          const isDirty = value !== originalValue

          return (
            <section key={key}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">{key}</h3>
              {isEditingThisField ? (
                <input
                  type="text"
                  value={
                    value !== undefined
                      ? typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)
                      : ''
                  }
                  onChange={(e) => handleMetadataChange(key, e.target.value)}
                  onBlur={() => setEditingField(null)}
                  className={`w-full text-xs focus:outline-none ${getFieldStyle(true, isDirty)}`}
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => setEditingField(fieldId)}
                  className={getFieldStyle(false, isDirty)}
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
        <h3 className="text-xs font-semibold text-muted-foreground mb-1">embedding</h3>
        {editingField === 'embedding' ? (
          <div className="space-y-2">
            <textarea
              ref={embeddingTextareaRef}
              value={draftEmbedding}
              onChange={(e) => {
                setDraftEmbedding(e.target.value)
                setEmbeddingError(null)
              }}
              onBlur={() => setEditingField(null)}
              className={`w-full text-xs font-mono overflow-hidden focus:outline-none ${getFieldStyle(true, hasEmbeddingChanges)}`}
              autoFocus
            />
            {embeddingError && (
              <p className="text-xs text-destructive">{embeddingError}</p>
            )}
          </div>
        ) : (
          <div
            onClick={handleEmbeddingEditStart}
            className={getFieldStyle(false, hasEmbeddingChanges)}
          >
            <EmbeddingCell embedding={document.embedding} />
          </div>
        )}
      </section>

      {/* Dirty indicator */}
      {hasDirtyChanges && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {isPending ? 'Saving...' : 'Unsaved changes — ⌘S to save, ⌘Z to revert'}
        </div>
      )}

      {/* Regenerate Embedding Dialog */}
      <RegenerateEmbeddingDialog
        open={showRegenerateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowRegenerateDialog(false)
          }
        }}
        onConfirm={handleRegenerateConfirm}
        isLoading={isPending}
      />
    </div>
  )
}

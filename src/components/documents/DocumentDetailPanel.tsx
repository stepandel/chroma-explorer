import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import EmbeddingCell from './EmbeddingCell'
import { RegenerateEmbeddingDialog } from './RegenerateEmbeddingDialog'
import { useUpdateDocumentMutation } from '../../hooks/useChromaQueries'
import { SHORTCUTS, matchesShortcut } from '../../constants/keyboard-shortcuts'
import { Metadata } from 'chromadb'
import { TypedMetadataRecord, TypedMetadataField, MetadataValueType, validateMetadataValue } from '../../types/metadata'

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
  isDraft?: boolean
  isFirstDocument?: boolean
  databaseType?: 'chroma' | 'pinecone'
  onDraftChange?: (updates: { id?: string; document?: string; metadata?: Record<string, unknown> }) => void
}

export default function DocumentDetailPanel({
  document,
  collectionName,
  profileId,
  isDraft = false,
  isFirstDocument = false,
  databaseType = 'chroma',
  onDraftChange,
}: DocumentDetailPanelProps) {
  // Draft state
  const [draftDocument, setDraftDocument] = useState(document.document)
  const [draftMetadata, setDraftMetadata] = useState(document.metadata)
  const [draftEmbedding, setDraftEmbedding] = useState<string>('')
  const [embeddingError, setEmbeddingError] = useState<string | null>(null)
  const [isEditingEmbedding, setIsEditingEmbedding] = useState(false)

  // Regenerate embedding dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)

  // Update mutation
  const updateMutation = useUpdateDocumentMutation(profileId, collectionName)

  // Ref for embedding textarea
  const embeddingTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize embedding textarea and focus without scrolling
  useEffect(() => {
    if (isEditingEmbedding && embeddingTextareaRef.current) {
      const textarea = embeddingTextareaRef.current

      // Find scroll container (the panel's scrollable div)
      const scrollContainer = textarea.closest('.overflow-auto')
      const savedScrollTop = scrollContainer?.scrollTop ?? 0

      // Resize
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(textarea.scrollHeight, 100)}px`

      // Restore scroll position
      if (scrollContainer) {
        scrollContainer.scrollTop = savedScrollTop
      }

      // Focus without scrolling
      textarea.focus({ preventScroll: true })
    }
  }, [draftEmbedding, isEditingEmbedding])

  // Check if there are unsaved changes
  // For drafts (new documents), always consider dirty since they need to be saved
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
  const hasDirtyChanges = isDraft || hasDocumentChanges || hasMetadataChanges || hasEmbeddingChanges

  // Reset drafts when document changes
  useEffect(() => {
    setDraftDocument(document.document)
    setDraftMetadata(document.metadata)
    setDraftEmbedding(document.embedding ? JSON.stringify(document.embedding) : '')
    setEmbeddingError(null)
    setIsEditingEmbedding(false)
  }, [document.id, document.document, document.metadata, document.embedding])

  // Handle cancel/revert all changes
  const handleCancel = useCallback(() => {
    setDraftDocument(document.document)
    setDraftMetadata(document.metadata)
    setDraftEmbedding(document.embedding ? JSON.stringify(document.embedding) : '')
    setEmbeddingError(null)
    setIsEditingEmbedding(false)
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
      setEmbeddingError(null)
    } catch (error) {
      console.error('Failed to update document:', error)
    }
  }

  // Handle metadata value change
  const handleMetadataChange = (key: string, value: string) => {
    if (!draftMetadata) return

    // Check if this is a typed metadata field (for drafts)
    const existingField = draftMetadata[key]
    const isTypedField = existingField && typeof existingField === 'object' && 'type' in existingField

    let newMetadata: Record<string, unknown>

    if (isDraft && isTypedField) {
      // For drafts with typed fields, update the value property
      const typedField = existingField as TypedMetadataField
      newMetadata = {
        ...draftMetadata,
        [key]: { ...typedField, value }
      }
    } else {
      // For existing documents, try to preserve original type
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

      newMetadata = { ...draftMetadata, [key]: parsedValue }
    }

    setDraftMetadata(newMetadata)

    if (isDraft && onDraftChange) {
      onDraftChange({ metadata: newMetadata })
    }
  }

  // Add a new metadata field (only for first document drafts)
  const handleAddMetadataField = useCallback(() => {
    const currentMetadata = (draftMetadata || {}) as TypedMetadataRecord
    let keyNum = 1
    let newKey = `key${keyNum}`
    while (newKey in currentMetadata) {
      keyNum++
      newKey = `key${keyNum}`
    }
    const newMetadata: TypedMetadataRecord = {
      ...currentMetadata,
      [newKey]: { value: '', type: 'string' }
    }
    setDraftMetadata(newMetadata)
    if (isDraft && onDraftChange) {
      onDraftChange({ metadata: newMetadata })
    }
  }, [draftMetadata, isDraft, onDraftChange])

  // Remove a metadata field (only for first document drafts)
  const handleRemoveMetadataField = useCallback((keyToRemove: string) => {
    if (!draftMetadata) return
    const { [keyToRemove]: _, ...rest } = draftMetadata as TypedMetadataRecord
    setDraftMetadata(rest)
    if (isDraft && onDraftChange) {
      onDraftChange({ metadata: rest })
    }
  }, [draftMetadata, isDraft, onDraftChange])

  // Handle metadata key rename (only for first document drafts)
  const handleMetadataKeyRename = useCallback((oldKey: string, newKey: string) => {
    if (!draftMetadata || oldKey === newKey) return
    const typedMetadata = draftMetadata as TypedMetadataRecord
    const { [oldKey]: field, ...rest } = typedMetadata
    const newMetadata: TypedMetadataRecord = { ...rest, [newKey]: field }
    setDraftMetadata(newMetadata)
    if (isDraft && onDraftChange) {
      onDraftChange({ metadata: newMetadata })
    }
  }, [draftMetadata, isDraft, onDraftChange])

  // Handle metadata type change (only for first document drafts)
  const handleMetadataTypeChange = useCallback((key: string, newType: MetadataValueType) => {
    if (!draftMetadata) return
    const typedMetadata = draftMetadata as TypedMetadataRecord
    const field = typedMetadata[key]
    if (!field) return
    const newMetadata: TypedMetadataRecord = {
      ...typedMetadata,
      [key]: { ...field, type: newType }
    }
    setDraftMetadata(newMetadata)
    if (isDraft && onDraftChange) {
      onDraftChange({ metadata: newMetadata })
    }
  }, [draftMetadata, isDraft, onDraftChange])

  // Handle metadata value change for typed fields (first document drafts)
  const handleTypedMetadataValueChange = useCallback((key: string, newValue: string) => {
    if (!draftMetadata) return
    const typedMetadata = draftMetadata as TypedMetadataRecord
    const field = typedMetadata[key]
    if (!field) return
    const newMetadata: TypedMetadataRecord = {
      ...typedMetadata,
      [key]: { ...field, value: newValue }
    }
    setDraftMetadata(newMetadata)
    if (isDraft && onDraftChange) {
      onDraftChange({ metadata: newMetadata })
    }
  }, [draftMetadata, isDraft, onDraftChange])

  // Keyboard shortcuts - using centralized SHORTCUTS definitions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+S or Command+Enter to save
      if (matchesShortcut(e, SHORTCUTS.SAVE) || matchesShortcut(e, SHORTCUTS.SAVE_ENTER)) {
        e.preventDefault()
        if (hasDirtyChanges) {
          handleSave()
        }
      }
      // Command+Z to cancel/revert (only when we have changes, and not Shift+Z for redo)
      if (matchesShortcut(e, SHORTCUTS.UNDO) && hasDirtyChanges) {
        e.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasDirtyChanges, handleSave, handleCancel])

  const isPending = updateMutation.isPending

  // Common field styling - soft material separation instead of hard borders
  const fieldBaseStyle = 'p-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-md transition-colors'
  const getFieldStyle = (isDirty: boolean, isFocused?: boolean) => {
    if (isFocused) {
      return `${fieldBaseStyle} ring-1 ring-blue-500/30`
    }
    if (isDirty) {
      return `${fieldBaseStyle} ring-1 ring-blue-500/20`
    }
    return `${fieldBaseStyle} focus-within:ring-1 focus-within:ring-blue-500/30`
  }

  return (
    <div
      className="h-full"
      style={{
        background: 'var(--panel-detail)',
        backdropFilter: 'blur(24px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
        boxShadow: 'var(--panel-detail-shadow)',
      }}
    >
      <div className="h-full overflow-auto space-y-3 p-3">
      {/* ID Section - Only for Chroma, editable for drafts */}
      {databaseType === 'chroma' && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">id</h3>
          {isDraft ? (
            <input
              type="text"
              value={document.id}
              onChange={(e) => {
                if (onDraftChange) {
                  onDraftChange({ id: e.target.value })
                }
              }}
              placeholder="Enter document ID"
              className="w-full text-xs font-mono p-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-md ring-1 ring-blue-500/20 focus:outline-none focus:ring-blue-500/30"
            />
          ) : (
            <div className="p-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-md">
              <code className="text-xs font-mono break-all">{document.id}</code>
            </div>
          )}
        </section>
      )}

      {/* Document Text Section - Only for Chroma */}
      {databaseType === 'chroma' && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">document</h3>
          <textarea
            rows={1}
            value={draftDocument ?? ''}
            onChange={(e) => {
              setDraftDocument(e.target.value)
              if (isDraft && onDraftChange) {
                onDraftChange({ document: e.target.value })
              }
            }}
            placeholder="No document - type to add"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            className={`w-full text-xs whitespace-pre-wrap overflow-hidden focus:outline-none resize-none ${getFieldStyle(hasDocumentChanges)}`}
          />
        </section>
      )}

      {/* Metadata Fields - Each as Individual Section */}
      {(() => {
        if (!draftMetadata) return null
        const canEditSchema = isDraft && isFirstDocument
        const entries = Object.entries(draftMetadata)
        // Only sort when not editing schema (sorting while editing causes focus issues)
        if (!canEditSchema) {
          entries.sort(([a], [b]) => a.localeCompare(b))
        }
        return entries.map(([key, value], index) => {
          // Check if value is a TypedMetadataField (has value and type properties)
          const isTypedField = value && typeof value === 'object' && 'value' in value && 'type' in value
          const typedField = isTypedField ? (value as TypedMetadataField) : null
          const displayValue = typedField ? typedField.value : (
            value !== undefined
              ? typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)
              : ''
          )
          const originalValue = document.metadata?.[key]
          const isDirty = isDraft ? true : value !== originalValue
          // Validate typed fields for all drafts (not just first document)
          const validationError = isDraft && typedField ? validateMetadataValue(typedField.value, typedField.type) : null

          // Use index as key when editing schema to prevent focus loss when key name changes
          return (
            <section key={canEditSchema ? `field-${index}` : key}>
              {canEditSchema ? (
                // First document draft - editable key with type selector and remove button
                <div className="flex items-center gap-1 mb-1">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => handleMetadataKeyRename(key, e.target.value)}
                    className="flex-1 text-xs font-semibold text-muted-foreground bg-transparent border-none outline-none focus:text-foreground"
                  />
                  {typedField && (
                    <div className="relative">
                      <select
                        value={typedField.type}
                        onChange={(e) => handleMetadataTypeChange(key, e.target.value as MetadataValueType)}
                        className="h-5 pl-1.5 pr-5 appearance-none rounded-md bg-black/[0.05] dark:bg-white/[0.08] text-[10px] focus:outline-none focus:ring-1 focus:ring-ring/50 cursor-pointer"
                      >
                        <option value="string">str</option>
                        <option value="number">num</option>
                        <option value="boolean">bool</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMetadataField(key)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                // Regular mode - just the label
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">{key}</h3>
              )}
              <textarea
                rows={1}
                value={displayValue}
                onChange={(e) => {
                  if (canEditSchema && typedField) {
                    handleTypedMetadataValueChange(key, e.target.value)
                  } else {
                    handleMetadataChange(key, e.target.value)
                  }
                }}
                placeholder={typedField?.type === 'boolean' ? 'true / false' : typedField?.type === 'number' ? '0' : undefined}
                style={{ fieldSizing: 'content' } as React.CSSProperties}
                className={`w-full text-xs whitespace-pre-wrap overflow-hidden focus:outline-none resize-none ${getFieldStyle(isDirty)} ${validationError ? 'border-destructive' : ''}`}
              />
              {validationError && (
                <p className="text-xs text-destructive mt-0.5">{validationError}</p>
              )}
            </section>
          )
        })
      })()}

      {/* Add metadata field button - only for first document drafts */}
      {isDraft && isFirstDocument && (
        <section>
          <button
            type="button"
            onClick={handleAddMetadataField}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add metadata field
          </button>
        </section>
      )}

      {/* Embedding Section - Click to edit (hidden for drafts) */}
      {!isDraft && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">embedding</h3>
          {isEditingEmbedding ? (
            <div>
              <textarea
                ref={embeddingTextareaRef}
                value={draftEmbedding}
                onChange={(e) => {
                  setDraftEmbedding(e.target.value)
                  setEmbeddingError(null)
                }}
                onBlur={() => setIsEditingEmbedding(false)}
                placeholder="No embedding"
                className={`w-full text-xs font-mono overflow-hidden focus:outline-none resize-none ${getFieldStyle(hasEmbeddingChanges)}`}
              />
              {embeddingError && (
                <p className="text-xs text-destructive mt-1">{embeddingError}</p>
              )}
            </div>
          ) : (
            <div
              onClick={() => setIsEditingEmbedding(true)}
              className={`cursor-pointer ${getFieldStyle(hasEmbeddingChanges)}`}
            >
              <EmbeddingCell embedding={document.embedding} />
            </div>
          )}
        </section>
      )}

      {/* Dirty indicator */}
      {hasDirtyChanges && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {isPending ? 'Saving...' : 'Unsaved changes — ⌘↵ to save, ⌘Z to revert'}
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
    </div>
  )
}

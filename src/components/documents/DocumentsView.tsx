import { useMemo, useState, useEffect, useCallback } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useDocumentsQuery, useCollectionsQuery, useCreateDocumentMutation, useDeleteDocumentsMutation } from '../../hooks/useChromaQueries'
import DocumentsTable from './DocumentsTable'
import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'
import { TypedMetadataRecord, TypedMetadataField, typedMetadataToChromaFormat, validateMetadataValue } from '../../types/metadata'
import { EmbeddingFunctionSelector } from './EmbeddingFunctionSelector'
import { FilterRow } from '../filters/FilterRow'

interface DraftDocument {
  id: string
  document: string
  metadata: TypedMetadataRecord
}

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsViewProps {
  collectionName: string
  // Multi-select props
  selectedDocumentIds: Set<string>
  primarySelectedDocumentId: string | null
  selectionAnchor: string | null
  onSingleSelect: (id: string) => void
  onToggleSelect: (id: string) => void
  onRangeSelect: (ids: string[], newAnchor?: string) => void
  onAddToSelection: (ids: string[]) => void
  onClearSelection: () => void
  onSetSelectionAnchor: (id: string | null) => void
  onSelectedDocumentChange: (document: DocumentRecord | null, isDraft: boolean) => void
  // Expose draft change handler for external updates (e.g., from detail panel)
  onExposeDraftHandler?: (handler: ((updates: { document?: string; metadata?: Record<string, unknown> }) => void) | null) => void
  // Callback to notify parent if current draft is for the first document (empty collection)
  onIsFirstDocumentChange?: (isFirst: boolean) => void
}

function createDefaultFilterRow(): FilterRowType {
  return {
    id: crypto.randomUUID(),
    type: 'search',
    searchValue: '',
  }
}

export default function DocumentsView({
  collectionName,
  selectedDocumentIds,
  primarySelectedDocumentId,
  selectionAnchor,
  onSingleSelect,
  onToggleSelect,
  onRangeSelect,
  onAddToSelection,
  onClearSelection,
  onSetSelectionAnchor,
  onSelectedDocumentChange,
  onExposeDraftHandler,
  onIsFirstDocumentChange,
}: DocumentsViewProps) {
  const { currentProfile } = useChromaDB()
  const [filterRows, setFilterRows] = useState<FilterRowType[]>([createDefaultFilterRow()])
  const [nResults, setNResults] = useState(10)

  // Draft document state for creating new documents
  const [draftDocument, setDraftDocument] = useState<DraftDocument | null>(null)

  // Validation error for draft document
  const [draftError, setDraftError] = useState<string | null>(null)

  // Marked for deletion state (set of document IDs)
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set())

  // Create document mutation
  const createMutation = useCreateDocumentMutation(
    currentProfile?.id || '',
    collectionName
  )

  // Delete documents mutation
  const deleteMutation = useDeleteDocumentsMutation(
    currentProfile?.id || '',
    collectionName
  )

  // Fetch collections to get the current collection's info
  const { data: collections = [] } = useCollectionsQuery(currentProfile?.id || null)
  const currentCollection = collections.find(c => c.name === collectionName)

  // Embedding function override state
  const [embeddingOverride, setEmbeddingOverride] = useState<EmbeddingFunctionOverride | null>(null)

  // Fetch embedding override when collection changes
  useEffect(() => {
    const fetchOverride = async () => {
      if (!currentProfile?.id || !collectionName) return
      try {
        const override = await window.electronAPI.profiles.getEmbeddingOverride(
          currentProfile.id,
          collectionName
        )
        setEmbeddingOverride(override)
      } catch (err) {
        console.error('Failed to fetch embedding override:', err)
      }
    }
    fetchOverride()
  }, [currentProfile?.id, collectionName])

  const handleSaveOverride = useCallback(async (override: EmbeddingFunctionOverride) => {
    if (!currentProfile?.id) return
    await window.electronAPI.profiles.setEmbeddingOverride(
      currentProfile.id,
      collectionName,
      override
    )
    setEmbeddingOverride(override)
  }, [currentProfile?.id, collectionName])

  const handleClearOverride = useCallback(async () => {
    if (!currentProfile?.id) return
    await window.electronAPI.profiles.clearEmbeddingOverride(
      currentProfile.id,
      collectionName
    )
    setEmbeddingOverride(null)
  }, [currentProfile?.id, collectionName])

  // Reset filters and deletion marks when collection changes
  useEffect(() => {
    setFilterRows([createDefaultFilterRow()])
    setNResults(10)
    setMarkedForDeletion(new Set())
    setDraftDocument(null)
    setDraftError(null)
  }, [collectionName])

  // Build search params from filter rows
  const searchParams = useMemo(() => {
    // Extract search query from search-type rows
    const searchRow = filterRows.find(r => r.type === 'search' && r.searchValue?.trim())
    const queryText = searchRow?.searchValue?.trim() || undefined

    // Helper to parse filter value based on operator
    const parseFilterValue = (value: string, operator: string): string | number | string[] | number[] => {
      const trimmed = value.trim()

      // Handle array operators ($in, $nin)
      if (operator === '$in' || operator === '$nin') {
        const items = trimmed.split(',').map(s => s.trim()).filter(Boolean)
        // Try to parse as numbers if all items are numeric
        const asNumbers = items.map(Number)
        if (asNumbers.every(n => !isNaN(n))) {
          return asNumbers
        }
        return items
      }

      // For comparison operators, try to parse as number
      if (['$gt', '$gte', '$lt', '$lte'].includes(operator)) {
        const num = Number(trimmed)
        if (!isNaN(num)) {
          return num
        }
      }

      // For equality operators, try number first, fall back to string
      if (operator === '$eq' || operator === '$ne') {
        const num = Number(trimmed)
        if (!isNaN(num) && trimmed !== '') {
          return num
        }
      }

      return trimmed
    }

    // Extract metadata filters from metadata-type rows
    const metadataRows = filterRows.filter(
      r => r.type === 'metadata' && r.metadataKey?.trim() && r.metadataValue?.trim()
    )
    const metadataFilter = metadataRows.length > 0
      ? metadataRows.reduce((acc, row) => ({
          ...acc,
          [row.metadataKey!]: {
            [row.operator || '$eq']: parseFilterValue(row.metadataValue!, row.operator || '$eq')
          },
        }), {})
      : undefined

    return {
      collectionName,
      queryText,
      nResults,
      metadataFilter,
    }
  }, [collectionName, filterRows, nResults])

  // Use React Query for documents with debouncing via staleTime
  const {
    data: documents = [],
    isLoading: loading,
    error,
  } = useDocumentsQuery(currentProfile?.id || null, searchParams)

  // Extract unique metadata fields from documents (needed for draft creation)
  const metadataFields = useMemo(() => {
    const fields = new Set<string>()
    documents.forEach(doc => {
      if (doc.metadata) {
        Object.keys(doc.metadata).forEach(key => fields.add(key))
      }
    })
    return Array.from(fields).sort()
  }, [documents])

  // Filter row handlers
  const handleFilterRowChange = useCallback((id: string, updates: Partial<FilterRowType>) => {
    setFilterRows(prev => prev.map(row =>
      row.id === id ? { ...row, ...updates } : row
    ))
  }, [])

  const handleAddFilterRow = useCallback(() => {
    setFilterRows(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'metadata',
      metadataKey: '',
      operator: '$eq' as MetadataOperator,
      metadataValue: '',
    }])
  }, [])

  const handleRemoveFilterRow = useCallback((id: string) => {
    setFilterRows(prev => {
      const filtered = prev.filter(row => row.id !== id)
      // Always keep at least one row
      return filtered.length > 0 ? filtered : [createDefaultFilterRow()]
    })
  }, [])

  const hasActiveFilters = filterRows.some(row =>
    (row.type === 'search' && row.searchValue?.trim()) ||
    (row.type === 'metadata' && row.metadataKey?.trim() && row.metadataValue?.trim())
  )

  // Draft document handlers
  const handleStartCreate = useCallback(() => {
    const newId = crypto.randomUUID()
    // Check if this is the first document (collection is empty)
    const isFirstDocument = documents.length === 0
    // Initialize metadata with same keys as existing documents (empty values)
    // If first document, start with empty metadata (user will add fields)
    const initialMetadata: TypedMetadataRecord = {}
    if (!isFirstDocument) {
      // Infer types from existing documents
      metadataFields.forEach(key => {
        // Find the first document with this metadata key to infer type
        const existingDoc = documents.find(d => d.metadata && key in d.metadata)
        const existingValue = existingDoc?.metadata?.[key]
        let inferredType: 'string' | 'number' | 'boolean' = 'string'
        if (typeof existingValue === 'number') inferredType = 'number'
        else if (typeof existingValue === 'boolean') inferredType = 'boolean'
        initialMetadata[key] = { value: '', type: inferredType }
      })
    }
    setDraftDocument({
      id: newId,
      document: '',
      metadata: initialMetadata,
    })
    // Select the draft so it shows in the detail panel
    onSingleSelect(newId)
    // Notify parent about first document status
    onIsFirstDocumentChange?.(isFirstDocument)
  }, [onSingleSelect, metadataFields, documents.length, onIsFirstDocumentChange])

  const handleDraftChange = useCallback((draft: DraftDocument) => {
    setDraftDocument(draft)
    setDraftError(null) // Clear error when user makes changes
  }, [])

  // Handler for external draft updates (from detail panel)
  const handleExternalDraftUpdate = useCallback((updates: { document?: string; metadata?: Record<string, unknown> }) => {
    setDraftDocument((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        document: updates.document !== undefined ? updates.document : prev.document,
        metadata: updates.metadata !== undefined ? (updates.metadata as TypedMetadataRecord) : prev.metadata,
      }
    })
    setDraftError(null) // Clear error when user makes changes
  }, [])

  // Expose the draft update handler to parent
  useEffect(() => {
    if (onExposeDraftHandler) {
      onExposeDraftHandler(draftDocument ? handleExternalDraftUpdate : null)
    }
  }, [onExposeDraftHandler, draftDocument, handleExternalDraftUpdate])

  const handleCancelDraft = useCallback(() => {
    setDraftDocument(null)
    setDraftError(null)
    onClearSelection() // Deselect when cancelling
    onIsFirstDocumentChange?.(false) // Reset first document flag
  }, [onClearSelection, onIsFirstDocumentChange])

  const handleSaveDraft = useCallback(async () => {
    if (!draftDocument) return
    setDraftError(null)

    if (!draftDocument.id.trim()) {
      setDraftError('Document ID is required')
      return
    }

    // Document text is required (ChromaDB needs either document or embeddings)
    const documentText = draftDocument.document?.trim()
    if (!documentText) {
      setDraftError('Document text is required')
      return
    }

    // Validate metadata types before saving
    for (const [key, field] of Object.entries(draftDocument.metadata)) {
      if (field && typeof field === 'object' && 'value' in field && 'type' in field) {
        const typedField = field as TypedMetadataField
        const error = validateMetadataValue(typedField.value, typedField.type)
        if (error) {
          setDraftError(`Metadata "${key}": ${error}`)
          return
        }
      }
    }

    try {
      // Convert typed metadata to ChromaDB format
      const metadata = typedMetadataToChromaFormat(draftDocument.metadata)

      await createMutation.mutateAsync({
        id: draftDocument.id,
        document: documentText,
        metadata,
        generateEmbedding: true,
      })
      setDraftDocument(null)
      setDraftError(null)
      onClearSelection() // Deselect after saving
      onIsFirstDocumentChange?.(false) // Reset first document flag
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create document'
      setDraftError(message)
    }
  }, [draftDocument, createMutation, onClearSelection, onIsFirstDocumentChange])

  // Toggle deletion mark for all selected documents
  const handleToggleDeletion = useCallback(() => {
    if (selectedDocumentIds.size === 0) return
    // Filter out draft from selection
    const idsToMark = Array.from(selectedDocumentIds).filter(
      id => !(draftDocument && id === draftDocument.id)
    )
    if (idsToMark.length === 0) return

    setMarkedForDeletion(prev => {
      const next = new Set(prev)
      // Check if all selected are already marked
      const allMarked = idsToMark.every(id => prev.has(id))
      if (allMarked) {
        // Unmark all
        idsToMark.forEach(id => next.delete(id))
      } else {
        // Mark all
        idsToMark.forEach(id => next.add(id))
      }
      return next
    })
  }, [selectedDocumentIds, draftDocument])

  // Commit deletions
  const handleCommitDeletions = useCallback(async () => {
    if (markedForDeletion.size === 0) return

    try {
      await deleteMutation.mutateAsync(Array.from(markedForDeletion))
      // Clear marked items and clear selection if any selected docs were deleted
      const deletedSelected = Array.from(selectedDocumentIds).some(id => markedForDeletion.has(id))
      if (deletedSelected) {
        onClearSelection()
      }
      setMarkedForDeletion(new Set())
    } catch (error) {
      console.error('Failed to delete documents:', error)
    }
  }, [markedForDeletion, deleteMutation, selectedDocumentIds, onClearSelection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+S to save draft or commit deletions
      if (e.metaKey && e.key === 's') {
        e.preventDefault()
        if (draftDocument) {
          handleSaveDraft()
        } else if (markedForDeletion.size > 0) {
          handleCommitDeletions()
        }
      }
      // Escape or Command+Z to cancel draft
      if ((e.key === 'Escape' || (e.metaKey && e.key === 'z')) && draftDocument) {
        e.preventDefault()
        handleCancelDraft()
      }
      // Command+Delete/Backspace to toggle deletion mark
      if (e.metaKey && (e.key === 'Delete' || e.key === 'Backspace') && !draftDocument) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        e.preventDefault()
        handleToggleDeletion()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draftDocument, handleSaveDraft, handleCancelDraft, handleToggleDeletion, handleCommitDeletions, markedForDeletion])

  // Find primary selected document for drawer (check draft first, then existing documents)
  const selectedDocument: DocumentRecord | null = useMemo(() => {
    if (!primarySelectedDocumentId) return null

    // Check if draft is selected
    if (draftDocument && draftDocument.id === primarySelectedDocumentId) {
      // Include metadata if there are any keys, even with empty values
      const hasMetadataKeys = Object.keys(draftDocument.metadata).length > 0
      return {
        id: draftDocument.id,
        document: draftDocument.document || null,
        metadata: hasMetadataKeys ? draftDocument.metadata : null,
        embedding: null,
      }
    }

    // Check existing documents
    return documents.find(doc => doc.id === primarySelectedDocumentId) || null
  }, [primarySelectedDocumentId, draftDocument, documents])

  // Check if selected document is a draft
  const isDraft = !!(draftDocument && primarySelectedDocumentId === draftDocument.id)

  // Notify parent when selected document changes
  useEffect(() => {
    onSelectedDocumentChange(selectedDocument, isDraft)
  }, [selectedDocument, isDraft, onSelectedDocumentChange])

  return (
    <div className="flex flex-col h-full">
            {/* Row 1: Collection name and count */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">{collectionName}</h1>
                <EmbeddingFunctionSelector
                  collectionName={collectionName}
                  currentOverride={embeddingOverride}
                  serverConfig={currentCollection?.embeddingFunction || null}
                  onSave={handleSaveOverride}
                  onClear={handleClearOverride}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {!loading && !error && `${documents.length} record${documents.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Row 2: Filters */}
            <div className="px-4 py-2 border-b border-border space-y-2">
              {/* Filter rows */}
              {filterRows.map((row, index) => (
                <FilterRow
                  key={row.id}
                  row={row}
                  isFirst={index === 0}
                  isLast={index === filterRows.length - 1}
                  canRemove={filterRows.length > 1}
                  onChange={handleFilterRowChange}
                  onAdd={handleAddFilterRow}
                  onRemove={handleRemoveFilterRow}
                  nResults={nResults}
                  onNResultsChange={setNResults}
                  metadataFields={metadataFields}
                />
              ))}
            </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DocumentsTable
          documents={documents}
          loading={loading}
          error={error ? (error as Error).message : null}
          hasActiveFilters={hasActiveFilters}
          selectedDocumentIds={selectedDocumentIds}
          selectionAnchor={selectionAnchor}
          onSingleSelect={onSingleSelect}
          onToggleSelect={onToggleSelect}
          onRangeSelect={onRangeSelect}
          onAddToSelection={onAddToSelection}
          draftDocument={draftDocument}
          onDraftChange={handleDraftChange}
          onDraftCancel={handleCancelDraft}
          markedForDeletion={markedForDeletion}
        />
      </div>

      {/* Bottom Toolbar */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between bg-background">
        <button
          onClick={handleStartCreate}
          disabled={!!draftDocument || markedForDeletion.size > 0}
          className="h-6 w-6 p-0 text-[11px] rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
          title="Add document"
        >
          +
        </button>
        {draftDocument && (
          <div className="flex items-center gap-3">
            {draftError && (
              <span className="text-[11px] text-destructive">{draftError}</span>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCancelDraft}
                disabled={createMutation.isPending}
                className="h-6 px-2 text-[11px] rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={createMutation.isPending || !draftDocument.id.trim()}
                className="h-6 px-2 text-[11px] rounded-md bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#006DD9] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
        {!draftDocument && markedForDeletion.size > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-muted-foreground">
              {markedForDeletion.size} marked for deletion
            </span>
            <button
              onClick={() => setMarkedForDeletion(new Set())}
              disabled={deleteMutation.isPending}
              className="h-6 px-2 text-[11px] rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCommitDeletions}
              disabled={deleteMutation.isPending}
              className="h-6 px-2 text-[11px] rounded-md bg-red-500 hover:bg-red-600 active:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

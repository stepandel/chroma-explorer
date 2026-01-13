import { useMemo, useState, useEffect, useCallback } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useDocumentsQuery, useCollectionsQuery, useCreateDocumentMutation, useDeleteDocumentsMutation, useCreateDocumentsBatchMutation, useUpdateDocumentMutation } from '../../hooks/useChromaQueries'
import { useClipboard } from '../../context/ClipboardContext'
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
  onExposeDraftHandler?: (handler: ((updates: { id?: string; document?: string; metadata?: Record<string, unknown> }) => void) | null) => void
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

  // Draft documents state - supports single new document or multiple pasted documents
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([])

  // Validation error for draft documents
  const [draftError, setDraftError] = useState<string | null>(null)

  // Helper to check if we have drafts
  const hasDrafts = draftDocuments.length > 0
  // For backwards compatibility with single draft operations
  const draftDocument = draftDocuments.length === 1 ? draftDocuments[0] : null

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

  // Create documents batch mutation (for pasting)
  const createBatchMutation = useCreateDocumentsBatchMutation(
    currentProfile?.id || '',
    collectionName
  )

  // Update document mutation (for inline editing)
  const updateMutation = useUpdateDocumentMutation(
    currentProfile?.id || '',
    collectionName
  )

  // Clipboard context
  const { clipboard, copyDocuments, hasCopiedDocuments } = useClipboard()

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
    setDraftDocuments([])
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
    data: queryData,
    isLoading: loading,
    error,
    isFetching,
  } = useDocumentsQuery(currentProfile?.id || null, searchParams)

  const rawDocuments = queryData?.documents ?? []
  const fetchTimeMs = queryData?.fetchTimeMs ?? null

  // Extract ID filter value for client-side filtering
  const idFilterValue = useMemo(() => {
    const selectRow = filterRows.find(r => r.type === 'select' && r.selectValue?.trim())
    return selectRow?.selectValue?.trim().toLowerCase() || ''
  }, [filterRows])

  // Apply client-side ID filter (case-insensitive "includes" match)
  const documents = useMemo(() => {
    if (!idFilterValue) {
      return rawDocuments
    }
    return rawDocuments.filter(doc =>
      doc.id.toLowerCase().includes(idFilterValue)
    )
  }, [rawDocuments, idFilterValue])

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
    (row.type === 'metadata' && row.metadataKey?.trim() && row.metadataValue?.trim()) ||
    (row.type === 'select' && row.selectValue?.trim())
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
    setDraftDocuments([{
      id: newId,
      document: '',
      metadata: initialMetadata,
    }])
    // Select the draft so it shows in the detail panel
    onSingleSelect(newId)
    // Notify parent about first document status
    onIsFirstDocumentChange?.(isFirstDocument)
  }, [onSingleSelect, metadataFields, documents.length, onIsFirstDocumentChange])

  const handleDraftChange = useCallback((draft: DraftDocument, index: number = 0) => {
    setDraftDocuments(prev => {
      const next = [...prev]
      next[index] = draft
      return next
    })
    setDraftError(null) // Clear error when user makes changes
  }, [])

  // Handler for external draft updates (from detail panel) - only works for single draft
  const handleExternalDraftUpdate = useCallback((updates: { id?: string; document?: string; metadata?: Record<string, unknown> }) => {
    setDraftDocuments((prev) => {
      if (prev.length !== 1) return prev
      const newId = updates.id !== undefined ? updates.id : prev[0].id
      return [{
        ...prev[0],
        id: newId,
        document: updates.document !== undefined ? updates.document : prev[0].document,
        metadata: updates.metadata !== undefined ? (updates.metadata as TypedMetadataRecord) : prev[0].metadata,
      }]
    })
    // Also update the primary selected document ID if ID changed
    if (updates.id !== undefined) {
      onSingleSelect(updates.id)
    }
    setDraftError(null) // Clear error when user makes changes
  }, [onSingleSelect])

  // Expose the draft update handler to parent (only for single draft)
  useEffect(() => {
    if (onExposeDraftHandler) {
      onExposeDraftHandler(draftDocuments.length === 1 ? handleExternalDraftUpdate : null)
    }
  }, [onExposeDraftHandler, draftDocuments.length, handleExternalDraftUpdate])

  const handleCancelDraft = useCallback(() => {
    setDraftDocuments([])
    setDraftError(null)
    onClearSelection() // Deselect when cancelling
    onIsFirstDocumentChange?.(false) // Reset first document flag
  }, [onClearSelection, onIsFirstDocumentChange])

  const handleSaveDraft = useCallback(async () => {
    if (draftDocuments.length === 0) return
    setDraftError(null)

    // Validate all drafts
    for (let i = 0; i < draftDocuments.length; i++) {
      const draft = draftDocuments[i]
      if (!draft.id.trim()) {
        setDraftError(`Document ${i + 1}: ID is required`)
        return
      }

      // Document text is required (ChromaDB needs either document or embeddings)
      const documentText = draft.document?.trim()
      if (!documentText) {
        setDraftError(`Document ${i + 1}: Document text is required`)
        return
      }

      // Validate metadata types before saving
      for (const [key, field] of Object.entries(draft.metadata)) {
        if (field && typeof field === 'object' && 'value' in field && 'type' in field) {
          const typedField = field as TypedMetadataField
          const error = validateMetadataValue(typedField.value, typedField.type)
          if (error) {
            setDraftError(`Document ${i + 1} - Metadata "${key}": ${error}`)
            return
          }
        }
      }
    }

    try {
      if (draftDocuments.length === 1) {
        // Single document - use single create mutation
        const draft = draftDocuments[0]
        const metadata = typedMetadataToChromaFormat(draft.metadata)
        await createMutation.mutateAsync({
          id: draft.id,
          document: draft.document.trim(),
          metadata,
          generateEmbedding: true,
        })
      } else {
        // Multiple documents - use batch create mutation
        const docsToCreate = draftDocuments.map(draft => ({
          id: draft.id,
          document: draft.document.trim(),
          metadata: typedMetadataToChromaFormat(draft.metadata),
        }))
        await createBatchMutation.mutateAsync({
          documents: docsToCreate,
          generateEmbeddings: true,
        })
      }
      setDraftDocuments([])
      setDraftError(null)
      onClearSelection() // Deselect after saving
      onIsFirstDocumentChange?.(false) // Reset first document flag
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create document(s)'
      setDraftError(message)
    }
  }, [draftDocuments, createMutation, createBatchMutation, onClearSelection, onIsFirstDocumentChange])

  // Toggle deletion mark for all selected documents
  const handleToggleDeletion = useCallback(() => {
    if (selectedDocumentIds.size === 0) return
    // Filter out drafts from selection
    const draftIds = new Set(draftDocuments.map(d => d.id))
    const idsToMark = Array.from(selectedDocumentIds).filter(
      id => !draftIds.has(id)
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
  }, [selectedDocumentIds, draftDocuments])

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

  // Copy selected documents to clipboard
  const handleCopyDocuments = useCallback(() => {
    if (selectedDocumentIds.size === 0 || !currentProfile?.id) return
    // Filter out drafts from selection and get document data
    const draftIds = new Set(draftDocuments.map(d => d.id))
    const docsToCopy = documents.filter(
      doc => selectedDocumentIds.has(doc.id) && !draftIds.has(doc.id)
    )
    if (docsToCopy.length === 0) return
    copyDocuments(docsToCopy, collectionName, currentProfile.id)
  }, [selectedDocumentIds, documents, draftDocuments, collectionName, currentProfile?.id, copyDocuments])

  // Resolve ID conflicts for pasting
  const resolveConflictingIds = useCallback((
    documentsToPaste: Array<{ id: string; document: string | null; metadata: Record<string, unknown> | null }>,
    existingIds: Set<string>
  ) => {
    const usedIds = new Set(existingIds)
    return documentsToPaste.map(doc => {
      let newId = doc.id
      let copyNum = 0

      while (usedIds.has(newId)) {
        copyNum++
        newId = copyNum === 1
          ? `${doc.id}-copy`
          : `${doc.id}-copy-${copyNum}`
      }

      usedIds.add(newId)
      return { ...doc, id: newId }
    })
  }, [])

  // Infer metadata field types from existing documents
  const inferMetadataTypes = useCallback((): Record<string, 'string' | 'number' | 'boolean'> => {
    const types: Record<string, 'string' | 'number' | 'boolean'> = {}
    documents.forEach(doc => {
      if (doc.metadata) {
        Object.entries(doc.metadata).forEach(([key, value]) => {
          if (!(key in types)) {
            if (typeof value === 'number') types[key] = 'number'
            else if (typeof value === 'boolean') types[key] = 'boolean'
            else types[key] = 'string'
          }
        })
      }
    })
    return types
  }, [documents])

  // Paste documents from clipboard - creates draft documents for review
  const handlePasteDocuments = useCallback(() => {
    if (!clipboard || clipboard.type !== 'documents' || !currentProfile?.id) return
    if (hasDrafts) return // Don't paste if there are already drafts

    // Get existing document IDs (including any current drafts)
    const existingIds = new Set(documents.map(d => d.id))

    // Resolve any ID conflicts
    const resolvedDocs = resolveConflictingIds(clipboard.documents, existingIds)

    // Infer metadata types from existing documents
    const existingTypes = inferMetadataTypes()

    // Convert to draft documents with proper metadata typing
    const drafts: DraftDocument[] = resolvedDocs.map(doc => {
      const typedMetadata: TypedMetadataRecord = {}

      // Process each metadata field from the pasted document
      if (doc.metadata) {
        Object.entries(doc.metadata).forEach(([key, value]) => {
          const expectedType = existingTypes[key]
          const actualType = typeof value

          if (expectedType) {
            // We have a type expectation from existing documents
            if (
              (expectedType === 'number' && actualType === 'number') ||
              (expectedType === 'boolean' && actualType === 'boolean') ||
              (expectedType === 'string' && actualType === 'string')
            ) {
              // Types match - use the value
              typedMetadata[key] = { value: String(value), type: expectedType }
            } else {
              // Types don't match - leave blank
              typedMetadata[key] = { value: '', type: expectedType }
            }
          } else {
            // New metadata key not in existing documents - infer type from value
            let inferredType: 'string' | 'number' | 'boolean' = 'string'
            if (actualType === 'number') inferredType = 'number'
            else if (actualType === 'boolean') inferredType = 'boolean'
            typedMetadata[key] = { value: String(value), type: inferredType }
          }
        })
      }

      // Add any metadata fields that exist in the collection but not in the pasted document
      Object.entries(existingTypes).forEach(([key, type]) => {
        if (!(key in typedMetadata)) {
          typedMetadata[key] = { value: '', type }
        }
      })

      return {
        id: doc.id,
        document: doc.document || '',
        metadata: typedMetadata,
      }
    })

    setDraftDocuments(drafts)
    // Select the first draft
    if (drafts.length > 0) {
      onSingleSelect(drafts[0].id)
    }
  }, [clipboard, currentProfile?.id, documents, hasDrafts, resolveConflictingIds, inferMetadataTypes, onSingleSelect])

  // Context menu handler for document row
  const handleDocumentContextMenu = useCallback((e: React.MouseEvent, documentId: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.electronAPI.contextMenu.showDocumentMenu(documentId, { hasCopiedDocuments })
  }, [hasCopiedDocuments])

  // Context menu handler for empty space in table
  const handleTableContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    window.electronAPI.contextMenu.showDocumentsPanelMenu({ hasCopiedDocuments })
  }, [hasCopiedDocuments])

  // Inline document update handler
  const handleInlineDocumentUpdate = useCallback(async (
    documentId: string,
    updates: { document?: string; metadata?: Record<string, unknown> }
  ) => {
    await updateMutation.mutateAsync({
      documentId,
      document: updates.document,
      metadata: updates.metadata as Record<string, string | number | boolean> | undefined,
    })
  }, [updateMutation])

  // Context menu action listener
  useEffect(() => {
    const unsubscribe = window.electronAPI.contextMenu.onDocumentAction((data) => {
      if (data.action === 'copy') {
        handleCopyDocuments()
      } else if (data.action === 'paste') {
        handlePasteDocuments()
      } else if (data.action === 'delete' && data.documentId) {
        // Select and mark for deletion
        onSingleSelect(data.documentId)
        setMarkedForDeletion(new Set([data.documentId]))
      }
    })
    return unsubscribe
  }, [handleCopyDocuments, handlePasteDocuments, onSingleSelect])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger copy/paste if user is typing in an input or has text selected
      const target = e.target as HTMLElement
      const isInputting = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      const hasTextSelection = (window.getSelection()?.toString() || '').length > 0

      // Command+S or Command+Enter to save drafts or commit deletions
      if (e.metaKey && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault()
        if (hasDrafts) {
          handleSaveDraft()
        } else if (markedForDeletion.size > 0) {
          handleCommitDeletions()
        }
      }
      // Escape or Command+Z to cancel drafts
      if ((e.key === 'Escape' || (e.metaKey && e.key === 'z')) && hasDrafts) {
        e.preventDefault()
        handleCancelDraft()
      }
      // Command+Delete/Backspace to toggle deletion mark
      if (e.metaKey && (e.key === 'Delete' || e.key === 'Backspace') && !hasDrafts) {
        if (isInputting) return
        e.preventDefault()
        handleToggleDeletion()
      }
      // Command+C to copy selected documents (but not if text is selected - let native copy work)
      if (e.metaKey && e.key === 'c' && selectedDocumentIds.size > 0 && !hasDrafts && !isInputting && !hasTextSelection) {
        e.preventDefault()
        handleCopyDocuments()
      }
      // Command+V to paste documents
      if (e.metaKey && e.key === 'v' && hasCopiedDocuments && !hasDrafts && !isInputting) {
        e.preventDefault()
        handlePasteDocuments()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasDrafts, handleSaveDraft, handleCancelDraft, handleToggleDeletion, handleCommitDeletions, markedForDeletion, selectedDocumentIds, handleCopyDocuments, handlePasteDocuments, hasCopiedDocuments])

  // Find primary selected document for drawer (check drafts first, then existing documents)
  const selectedDocument: DocumentRecord | null = useMemo(() => {
    if (!primarySelectedDocumentId) return null

    // Check if a draft is selected
    const selectedDraft = draftDocuments.find(d => d.id === primarySelectedDocumentId)
    if (selectedDraft) {
      // Include metadata if there are any keys, even with empty values
      const hasMetadataKeys = Object.keys(selectedDraft.metadata).length > 0
      return {
        id: selectedDraft.id,
        document: selectedDraft.document || null,
        metadata: hasMetadataKeys ? selectedDraft.metadata : null,
        embedding: null,
      }
    }

    // Check existing documents
    return documents.find(doc => doc.id === primarySelectedDocumentId) || null
  }, [primarySelectedDocumentId, draftDocuments, documents])

  // Check if selected document is a draft
  const isDraft = draftDocuments.some(d => d.id === primarySelectedDocumentId)

  // Notify parent when selected document changes
  useEffect(() => {
    onSelectedDocumentChange(selectedDocument, isDraft)
  }, [selectedDocument, isDraft, onSelectedDocumentChange])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar area - calm floating control surface */}
      <div className="flex-shrink-0 bg-white/60 dark:bg-white/[0.03]">
        {/* Row 1: Collection name and count */}
        <div className="px-4 py-2 flex items-center justify-between">
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
        <div className="px-4 py-2 pb-3 space-y-2">
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
      </div>

      {/* Table - primary content canvas */}
      <div
        className="flex-1 overflow-auto"
        style={{
          background: 'var(--canvas-background)',
        }}
      >
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
          draftDocuments={draftDocuments}
          onDraftChange={handleDraftChange}
          onDraftCancel={handleCancelDraft}
          markedForDeletion={markedForDeletion}
          onDocumentUpdate={handleInlineDocumentUpdate}
          onDocumentContextMenu={handleDocumentContextMenu}
          onTableContextMenu={handleTableContextMenu}
        />
      </div>

      {/* Bottom Toolbar */}
      <div className="px-4 py-1.5 flex items-center justify-between">
        <button
          onClick={handleStartCreate}
          disabled={hasDrafts || markedForDeletion.size > 0}
          className="h-6 w-6 p-0 text-[11px] rounded-md bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add document"
        >
          +
        </button>
        {hasDrafts && (
          <div className="flex items-center gap-3">
            {draftError && (
              <span className="text-[11px] text-destructive">{draftError}</span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {draftDocuments.length} document{draftDocuments.length !== 1 ? 's' : ''} to add
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCancelDraft}
                disabled={createMutation.isPending || createBatchMutation.isPending}
                className="h-6 px-2 text-[11px] rounded-md bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={createMutation.isPending || createBatchMutation.isPending || draftDocuments.some(d => !d.id.trim())}
                className="h-6 px-2 text-[11px] rounded-md bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#006DD9] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(createMutation.isPending || createBatchMutation.isPending) ? 'Saving...' : (draftDocuments.length === 1 ? 'Save' : 'Save All')}
              </button>
            </div>
          </div>
        )}
        {!hasDrafts && markedForDeletion.size > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-muted-foreground">
              {markedForDeletion.size} marked for deletion
            </span>
            <button
              onClick={() => setMarkedForDeletion(new Set())}
              disabled={deleteMutation.isPending}
              className="h-6 px-2 text-[11px] rounded-md bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed"
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
        {!hasDrafts && markedForDeletion.size === 0 && fetchTimeMs !== null && !loading && (
          <span className="text-[10px] text-muted-foreground">
            {isFetching ? 'fetching...' : `${fetchTimeMs}ms`}
          </span>
        )}
      </div>
    </div>
  )
}

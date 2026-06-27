import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { useDraftCollection, DraftHNSWConfig } from '../../context/DraftCollectionContext'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useCollection } from '../../context/CollectionContext'
import {
  buildEmbeddingFunctionOverride,
  EMBEDDING_FUNCTIONS,
  EMBEDDING_FUNCTION_GROUPS,
  embeddingFunctionUsesUrl,
  getEmbeddingFunctionById,
  getEmbeddingFunctionUrlLabel,
  getEmbeddingFunctionUrlPlaceholder,
  validateEmbeddingFunctionUrl,
} from '../../constants/embedding-functions'
import { MetadataValueType, validateMetadataValue } from '../../types/metadata'
import { CopyProgressDialog } from './CopyProgressDialog'

const inputClassName = "w-full h-6 text-[11px] px-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function CollectionConfigView() {
  const { draftCollection, updateDraft, cancelCreation, saveDraft, isCreating, validationErrors, isCopyMode } = useDraftCollection()
  const { currentProfile, refreshCollections } = useChromaDB()
  const { setActiveCollection } = useCollection()

  const [showFirstDocument, setShowFirstDocument] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Copy operation state
  const [isCopying, setIsCopying] = useState(false)
  const [showCopyProgress, setShowCopyProgress] = useState(false)
  const [copyProgress, setCopyProgress] = useState<CopyProgress>({
    phase: 'creating',
    totalDocuments: 0,
    processedDocuments: 0,
    message: 'Preparing...',
  })

  const selectedEf = draftCollection ? getEmbeddingFunctionById(draftCollection.embeddingFunctionId) : EMBEDDING_FUNCTIONS[0]
  const embeddingFunctionUrlError = draftCollection && selectedEf
    ? validateEmbeddingFunctionUrl(selectedEf, draftCollection.embeddingFunctionUrl)
    : null
  const dimensionsLabel = selectedEf?.dimensions ? `${selectedEf.dimensions}d` : 'Inferred from first embedding'

  // Handle embedding function change - auto-populate dimension
  const handleEfChange = useCallback(
    (efId: string) => {
      const nextEf = getEmbeddingFunctionById(efId)
      updateDraft({
        embeddingFunctionId: efId,
        embeddingFunctionUrl: nextEf?.url || '',
      })
    },
    [updateDraft]
  )

  // Handle first document toggle
  const handleFirstDocumentToggle = useCallback(
    (enabled: boolean) => {
      setShowFirstDocument(enabled)
      if (enabled) {
        updateDraft({
          firstDocument: {
            id: crypto.randomUUID(),
            document: '',
            metadata: {},
          },
        })
      } else {
        updateDraft({ firstDocument: null })
      }
    },
    [updateDraft]
  )

  // Determine if embedding function has changed from source
  const needsEmbeddingRegeneration = useCallback(() => {
    if (!draftCollection?.sourceCollection) return false

    const source = draftCollection.sourceCollection
    const sourceType = source.embeddingFunction?.name ?? 'default'
    const sourceModel = source.embeddingFunction?.config?.model_name as string | undefined
    const sourceUrl = source.embeddingFunction?.config?.url as string | undefined

    const draftEf = getEmbeddingFunctionById(draftCollection.embeddingFunctionId)
    const draftUrl = draftCollection.embeddingFunctionUrl.trim() || draftEf?.url

    if (draftEf?.type !== sourceType) return true
    if (sourceModel && draftEf?.modelName !== sourceModel) return true
    if (draftUrl !== sourceUrl) return true

    return false
  }, [draftCollection])

  // Handle copy collection
  const handleCopyCollection = useCallback(async () => {
    if (!draftCollection?.sourceCollection || !currentProfile) return

    const errors: Record<string, string> = {}
    if (!draftCollection.name.trim()) {
      errors.name = 'Collection name is required'
    }
    const draftEf = getEmbeddingFunctionById(draftCollection.embeddingFunctionId)
    const urlError = validateEmbeddingFunctionUrl(draftEf, draftCollection.embeddingFunctionUrl)
    if (urlError) {
      errors.embeddingFunctionUrl = urlError
    }

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsCopying(true)
    setShowCopyProgress(true)
    setCopyProgress({
      phase: 'creating',
      totalDocuments: 0,
      processedDocuments: 0,
      message: 'Creating collection...',
    })

    // Subscribe to progress updates
    const unsubscribe = window.electronAPI.chromadb.onCopyProgress((progress) => {
      setCopyProgress(progress)
    })

    try {
      const draftEf = getEmbeddingFunctionById(draftCollection.embeddingFunctionId)

      // Build HNSW config
      const hnswConfig: HNSWConfig = {}
      if (draftCollection.hnsw.space !== 'l2') {
        hnswConfig.space = draftCollection.hnsw.space
      }
      if (draftCollection.hnsw.efConstruction.trim()) {
        const parsed = parseInt(draftCollection.hnsw.efConstruction, 10)
        if (!isNaN(parsed) && parsed > 0) {
          hnswConfig.efConstruction = parsed
        }
      }
      if (draftCollection.hnsw.maxNeighbors.trim()) {
        const parsed = parseInt(draftCollection.hnsw.maxNeighbors, 10)
        if (!isNaN(parsed) && parsed > 0) {
          hnswConfig.maxNeighbors = parsed
        }
      }

      const result = await window.electronAPI.chromadb.copyCollection(currentProfile.id, {
        sourceCollectionName: draftCollection.sourceCollection.name,
        targetName: draftCollection.name.trim(),
        embeddingFunction: draftEf
          ? buildEmbeddingFunctionOverride(draftEf, { url: draftCollection.embeddingFunctionUrl })
          : undefined,
        hnsw: Object.keys(hnswConfig).length > 0 ? hnswConfig : undefined,
        regenerateEmbeddings: needsEmbeddingRegeneration(),
      })

      if (result.success) {
        setCopyProgress({
          phase: 'complete',
          totalDocuments: result.totalDocuments,
          processedDocuments: result.copiedDocuments,
          message: `Copied ${result.copiedDocuments} documents`,
        })
        // Refresh collections list
        await refreshCollections()
        // Select the new collection after dialog is closed
        setTimeout(() => {
          setActiveCollection(draftCollection.name.trim())
          cancelCreation()
        }, 500)
      } else {
        setCopyProgress({
          phase: 'error',
          totalDocuments: 0,
          processedDocuments: 0,
          message: result.error || 'Copy failed',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy collection'
      setCopyProgress({
        phase: 'error',
        totalDocuments: 0,
        processedDocuments: 0,
        message,
      })
    } finally {
      unsubscribe()
      setIsCopying(false)
    }
  }, [draftCollection, currentProfile, needsEmbeddingRegeneration, refreshCollections, setActiveCollection, cancelCreation])

  // Handle cancel copy
  const handleCancelCopy = useCallback(async () => {
    if (!currentProfile) return
    try {
      await window.electronAPI.chromadb.cancelCopy(currentProfile.id)
    } catch (error) {
      console.error('Failed to cancel copy:', error)
    }
  }, [currentProfile])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Cmd+Enter to save/copy
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault()
        if (isCopyMode) {
          handleCopyCollection()
        } else {
          saveDraft()
        }
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelCreation()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDraft, cancelCreation, isCopyMode, handleCopyCollection])

  if (!draftCollection) return null

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Configuration Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Copy mode indicator */}
        {isCopyMode && draftCollection.sourceCollection && (
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-[11px] text-primary">
              Copying from <span className="font-medium">{draftCollection.sourceCollection.name}</span>
              {' · '}
              <span className="text-muted-foreground">{draftCollection.sourceCollection.count} documents</span>
              {needsEmbeddingRegeneration() && (
                <span className="text-amber-600 dark:text-amber-400"> · embeddings will be regenerated</span>
              )}
            </p>
          </div>
        )}

        {/* Form error */}
        {validationErrors._form && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-[11px] text-destructive">{validationErrors._form}</p>
          </div>
        )}

        {/* Collection Name */}
        <div className="space-y-1">
          <label htmlFor="collection-name" className="text-[11px] font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="collection-name"
            type="text"
            value={draftCollection.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder="my-collection"
            className={inputClassName}
            style={inputStyle}
            autoFocus
          />
          {validationErrors.name && <p className="text-[10px] text-destructive">{validationErrors.name}</p>}
        </div>

        {/* Embedding Function Selector */}
        <div className="space-y-1">
          <label htmlFor="ef-select" className="text-[11px] font-medium text-muted-foreground">
            Embedding Function
          </label>
          <div className="relative">
            <select
              id="ef-select"
              value={draftCollection.embeddingFunctionId}
              onChange={(e) => handleEfChange(e.target.value)}
              className="w-full h-6 appearance-none rounded-md border border-input bg-background pl-1.5 pr-6 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              style={inputStyle}
            >
              {EMBEDDING_FUNCTION_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {EMBEDDING_FUNCTIONS.filter(ef => ef.group === group).map((ef) => (
                    <option key={ef.id} value={ef.id}>
                      {ef.label} {ef.dimensions ? `(${ef.dimensions}d)` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
          </div>
          {selectedEf && <p className="text-[10px] text-muted-foreground">{selectedEf.modelName}</p>}
        </div>

        {embeddingFunctionUsesUrl(selectedEf) && (
          <div className="space-y-1">
            <label htmlFor="ef-url" className="text-[11px] font-medium text-muted-foreground">
              {getEmbeddingFunctionUrlLabel(selectedEf)}
            </label>
            <input
              id="ef-url"
              type="url"
              value={draftCollection.embeddingFunctionUrl}
              onChange={(e) => updateDraft({ embeddingFunctionUrl: e.target.value })}
              placeholder={getEmbeddingFunctionUrlPlaceholder(selectedEf)}
              className={`${inputClassName} ${embeddingFunctionUrlError ? 'border-destructive' : ''}`}
              style={inputStyle}
            />
            {embeddingFunctionUrlError ? (
              <p className="text-[10px] text-destructive">{embeddingFunctionUrlError}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Used by the client when generating embeddings.
              </p>
            )}
          </div>
        )}

        {/* Dimension Info */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Dimensions
          </span>
          <p className="h-6 flex items-center text-[11px] px-1.5 rounded-md bg-muted/40 text-foreground/70">
            {dimensionsLabel}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Chroma sets the collection dimension from generated embeddings.
          </p>
        </div>

        {/* Advanced HNSW Settings */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            HNSW Index Settings
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-4">
              {/* Distance Function */}
              <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Distance Function
                  </span>
                <div className="flex gap-3">
                  {(['l2', 'cosine', 'ip'] as const).map((space) => (
                    <label key={space} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="hnsw-space"
                        value={space}
                        checked={draftCollection.hnsw.space === space}
                        onChange={() => updateDraft({ hnsw: { ...draftCollection.hnsw, space } })}
                          className="size-3"
                      />
                      <span className="text-[10px] text-foreground">
                        {space === 'l2' ? 'L2 (Euclidean)' : space === 'cosine' ? 'Cosine' : 'Inner Product'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* EF Construction & Max Neighbors */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label htmlFor="hnsw-ef-construction" className="text-[11px] font-medium text-muted-foreground">
                    EF Construction
                  </label>
                  <input
                    id="hnsw-ef-construction"
                    type="number"
                    value={draftCollection.hnsw.efConstruction}
                    onChange={(e) => updateDraft({ hnsw: { ...draftCollection.hnsw, efConstruction: e.target.value } })}
                    placeholder="100"
                    className={inputClassName}
                    style={inputStyle}
                  />
                  <p className="text-[10px] text-muted-foreground">Default: 100</p>
                </div>
                <div className="flex-1 space-y-1">
                  <label htmlFor="hnsw-max-neighbors" className="text-[11px] font-medium text-muted-foreground">
                    Max Neighbors (M)
                  </label>
                  <input
                    id="hnsw-max-neighbors"
                    type="number"
                    value={draftCollection.hnsw.maxNeighbors}
                    onChange={(e) => updateDraft({ hnsw: { ...draftCollection.hnsw, maxNeighbors: e.target.value } })}
                    placeholder="16"
                    className={inputClassName}
                    style={inputStyle}
                  />
                  <p className="text-[10px] text-muted-foreground">Default: 16</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional First Document Section - hidden in copy mode */}
        {!isCopyMode && (
        <div className="space-y-2 pt-3 border-t border-border">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showFirstDocument}
              onChange={(e) => handleFirstDocumentToggle(e.target.checked)}
              className="rounded border-input size-3.5"
            />
            <span className="text-[11px] font-medium text-foreground">Add first document</span>
          </label>

          {showFirstDocument && draftCollection.firstDocument && (
            <div className="space-y-3 pl-5">
              {/* Document ID */}
              <div className="space-y-1">
                  <label htmlFor="first-document-id" className="text-[11px] font-medium text-muted-foreground">
                    Document ID
                  </label>
                  <input
                    id="first-document-id"
                    type="text"
                  value={draftCollection.firstDocument.id}
                  onChange={(e) =>
                    updateDraft({
                      firstDocument: { ...draftCollection.firstDocument!, id: e.target.value },
                    })
                  }
                  className={`${inputClassName} font-mono`}
                  style={inputStyle}
                />
              </div>

              {/* Document Text */}
              <div className="space-y-1">
                  <label htmlFor="first-document-text" className="text-[11px] font-medium text-muted-foreground">
                    Document Text
                  </label>
                  <textarea
                    id="first-document-text"
                    value={draftCollection.firstDocument.document}
                  onChange={(e) =>
                    updateDraft({
                      firstDocument: { ...draftCollection.firstDocument!, document: e.target.value },
                    })
                  }
                  rows={3}
                  placeholder="Enter document text..."
                  className="w-full px-1.5 py-1 rounded-md border border-input bg-background text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                  style={inputStyle}
                />
              </div>

              {/* Metadata Fields */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Metadata</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentMetadata = draftCollection.firstDocument?.metadata || {}
                      let keyNum = 1
                      let newKey = `key${keyNum}`
                      while (newKey in currentMetadata) {
                        keyNum++
                        newKey = `key${keyNum}`
                      }
                      updateDraft({
                        firstDocument: {
                          ...draftCollection.firstDocument!,
                          metadata: { ...currentMetadata, [newKey]: { value: '', type: 'string' } },
                        },
                      })
                    }}
                    className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                      <Plus className="size-3" />
                    Add
                  </button>
                </div>

                {Object.keys(draftCollection.firstDocument.metadata || {}).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(draftCollection.firstDocument.metadata).map(([key, field], index) => {
                      const localError = validateMetadataValue(field.value, field.type)
                      const contextError = validationErrors[`metadata.${key}`]
                      const displayError = localError || contextError
                      return (
                        <div key={index} className="space-y-0.5">
                          <div className="flex items-center gap-1">
                              <input
                                type="text"
                                aria-label={`Metadata key ${key}`}
                                value={key}
                              onChange={(e) => {
                                const newKey = e.target.value
                                if (newKey === key) return
                                const { [key]: oldField, ...rest } = draftCollection.firstDocument!.metadata
                                updateDraft({
                                  firstDocument: {
                                    ...draftCollection.firstDocument!,
                                    metadata: { ...rest, [newKey]: oldField },
                                  },
                                })
                              }}
                              placeholder="key"
                              className="w-20 h-5 px-1 rounded border border-input bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                              style={inputStyle}
                            />
                            <div className="relative flex items-center">
                                <select
                                  aria-label={`Metadata type for ${key}`}
                                  value={field.type}
                                onChange={(e) => {
                                  updateDraft({
                                    firstDocument: {
                                      ...draftCollection.firstDocument!,
                                      metadata: {
                                        ...draftCollection.firstDocument!.metadata,
                                        [key]: { ...field, type: e.target.value as MetadataValueType },
                                      },
                                    },
                                  })
                                }}
                                className="h-5 pl-1 pr-4 appearance-none rounded border border-input bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                                style={inputStyle}
                              >
                                <option value="string">str</option>
                                <option value="number">num</option>
                                <option value="boolean">bool</option>
                              </select>
                                <ChevronDown className="absolute right-0.5 size-2.5 text-muted-foreground pointer-events-none" />
                            </div>
                              <input
                                type="text"
                                aria-label={`Metadata value for ${key}`}
                                value={field.value}
                              onChange={(e) => {
                                updateDraft({
                                  firstDocument: {
                                    ...draftCollection.firstDocument!,
                                    metadata: {
                                      ...draftCollection.firstDocument!.metadata,
                                      [key]: { ...field, value: e.target.value },
                                    },
                                  },
                                })
                              }}
                              placeholder={field.type === 'boolean' ? 'true / false' : field.type === 'number' ? '0' : 'value'}
                              className={`flex-1 h-5 px-1 rounded border bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring ${
                                displayError ? 'border-destructive' : 'border-input'
                              }`}
                              style={inputStyle}
                            />
                              <button
                                type="button"
                                aria-label={`Remove metadata field ${key}`}
                              onClick={() => {
                                const { [key]: _, ...rest } = draftCollection.firstDocument!.metadata
                                updateDraft({
                                  firstDocument: {
                                    ...draftCollection.firstDocument!,
                                    metadata: rest,
                                  },
                                })
                              }}
                              className="flex items-center justify-center p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <X className="size-3" />
                            </button>
                          </div>
                          {displayError && (
                            <p className="text-[10px] text-destructive pl-0.5">{displayError}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">No metadata fields defined.</p>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between bg-background">
        <div className="text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">⌘↵</kbd> {isCopyMode ? 'copy' : 'save'}
          {' · '}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd> cancel
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cancelCreation}
            disabled={isCreating || isCopying}
            className="h-6 px-2 text-[11px] rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            style={inputStyle}
          >
            Cancel
          </button>
          {isCopyMode ? (
            <button
              type="button"
              onClick={handleCopyCollection}
              disabled={isCopying || !draftCollection.name.trim() || Boolean(embeddingFunctionUrlError)}
              className="h-6 px-2 text-[11px] rounded-md bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#006DD9] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCopying ? 'Copying…' : 'Copy Collection'}
            </button>
          ) : (
            <button
              type="button"
              onClick={saveDraft}
              disabled={isCreating || !draftCollection.name.trim() || Boolean(embeddingFunctionUrlError)}
              className="h-6 px-2 text-[11px] rounded-md bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#006DD9] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating…' : 'Create'}
            </button>
          )}
        </div>
      </div>

      {/* Copy Progress Dialog */}
      {isCopyMode && draftCollection.sourceCollection && (
        <CopyProgressDialog
          open={showCopyProgress}
          onOpenChange={(open) => {
            if (!open && copyProgress.phase !== 'copying' && copyProgress.phase !== 'creating') {
              setShowCopyProgress(false)
              if (copyProgress.phase === 'complete') {
                cancelCreation()
              }
            }
          }}
          sourceCollectionName={draftCollection.sourceCollection.name}
          targetCollectionName={draftCollection.name}
          progress={copyProgress}
          onCancel={handleCancelCopy}
        />
      )}
    </div>
  )
}

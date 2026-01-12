import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { useDraftCollection, DraftHNSWConfig } from '../../context/DraftCollectionContext'
import { EMBEDDING_FUNCTIONS, getEmbeddingFunctionById } from '../../constants/embedding-functions'
import { MetadataValueType, validateMetadataValue } from '../../types/metadata'

const inputClassName = "w-full h-6 text-[11px] px-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function CollectionConfigView() {
  const { draftCollection, updateDraft, cancelCreation, saveDraft, isCreating, validationErrors } = useDraftCollection()

  const [showFirstDocument, setShowFirstDocument] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const selectedEf = draftCollection ? getEmbeddingFunctionById(draftCollection.embeddingFunctionId) : EMBEDDING_FUNCTIONS[0]

  // Handle embedding function change - auto-populate dimension
  const handleEfChange = useCallback(
    (efId: string) => {
      updateDraft({ embeddingFunctionId: efId, dimensionOverride: '' })
    },
    [updateDraft]
  )

  // Handle dimension override change
  const handleDimensionChange = useCallback(
    (value: string) => {
      updateDraft({ dimensionOverride: value })
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Cmd+Enter to save
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault()
        saveDraft()
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelCreation()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDraft, cancelCreation])

  if (!draftCollection) return null

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Configuration Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
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
              {EMBEDDING_FUNCTIONS.map((ef) => (
                <option key={ef.id} value={ef.id}>
                  {ef.label} ({ef.dimensions}d)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
          {selectedEf && <p className="text-[10px] text-muted-foreground">{selectedEf.modelName}</p>}
        </div>

        {/* Dimension Input */}
        <div className="space-y-1">
          <label htmlFor="dimension" className="text-[11px] font-medium text-muted-foreground">
            Dimension
          </label>
          <input
            id="dimension"
            type="number"
            value={draftCollection.dimensionOverride || ''}
            onChange={(e) => handleDimensionChange(e.target.value)}
            placeholder={selectedEf?.dimensions.toString() || '384'}
            className={inputClassName}
            style={inputStyle}
          />
          <p className="text-[10px] text-muted-foreground">
            Default: {selectedEf?.dimensions || 384}
          </p>
        </div>

        {/* Advanced HNSW Settings */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            HNSW Index Settings
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-4">
              {/* Distance Function */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Distance Function
                </label>
                <div className="flex gap-3">
                  {(['l2', 'cosine', 'ip'] as const).map((space) => (
                    <label key={space} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="hnsw-space"
                        value={space}
                        checked={draftCollection.hnsw.space === space}
                        onChange={() => updateDraft({ hnsw: { ...draftCollection.hnsw, space } })}
                        className="h-3 w-3"
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
                  <label className="text-[11px] font-medium text-muted-foreground">
                    EF Construction
                  </label>
                  <input
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
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Max Neighbors (M)
                  </label>
                  <input
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

        {/* Optional First Document Section */}
        <div className="space-y-2 pt-3 border-t border-border">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showFirstDocument}
              onChange={(e) => handleFirstDocumentToggle(e.target.checked)}
              className="rounded border-input h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-foreground">Add first document</span>
          </label>

          {showFirstDocument && draftCollection.firstDocument && (
            <div className="space-y-3 pl-5">
              {/* Document ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Document ID
                </label>
                <input
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
                <label className="text-[11px] font-medium text-muted-foreground">
                  Document Text
                </label>
                <textarea
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
                  <label className="text-[11px] font-medium text-muted-foreground">Metadata</label>
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
                    <Plus className="h-3 w-3" />
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
                              <ChevronDown className="absolute right-0.5 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
                            </div>
                            <input
                              type="text"
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
                              <X className="h-3 w-3" />
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
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between bg-background">
        <div className="text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">⌘↵</kbd> save
          {' · '}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd> cancel
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={cancelCreation}
            disabled={isCreating}
            className="h-6 px-2 text-[11px] rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            style={inputStyle}
          >
            Cancel
          </button>
          <button
            onClick={saveDraft}
            disabled={isCreating || !draftCollection.name.trim()}
            className="h-6 px-2 text-[11px] rounded-md bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#006DD9] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

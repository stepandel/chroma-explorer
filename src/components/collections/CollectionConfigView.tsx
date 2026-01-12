import { useState, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { useDraftCollection } from '../../context/DraftCollectionContext'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { EMBEDDING_FUNCTIONS, getEmbeddingFunctionById } from '../../constants/embedding-functions'

export function CollectionConfigView() {
  const { draftCollection, updateDraft, cancelCreation, saveDraft, isCreating, validationErrors } = useDraftCollection()

  const [showFirstDocument, setShowFirstDocument] = useState(false)

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
      // Cmd+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground">New Collection</h1>
        <span className="text-xs text-muted-foreground">Configure settings below</span>
      </div>

      {/* Configuration Form */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Form error */}
        {validationErrors._form && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{validationErrors._form}</p>
          </div>
        )}

        {/* Collection Name */}
        <div className="space-y-2">
          <Label htmlFor="collection-name">Collection Name</Label>
          <input
            id="collection-name"
            type="text"
            value={draftCollection.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder="my-collection"
            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          {validationErrors.name && <p className="text-xs text-destructive">{validationErrors.name}</p>}
        </div>

        {/* Embedding Function Selector */}
        <div className="space-y-2">
          <Label htmlFor="ef-select">Embedding Function</Label>
          <div className="relative">
            <select
              id="ef-select"
              value={draftCollection.embeddingFunctionId}
              onChange={(e) => handleEfChange(e.target.value)}
              className="w-full h-9 appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {EMBEDDING_FUNCTIONS.map((ef) => (
                <option key={ef.id} value={ef.id}>
                  {ef.label} ({ef.dimensions}d)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          {selectedEf && <p className="text-xs text-muted-foreground">Model: {selectedEf.modelName}</p>}
        </div>

        {/* Dimension Input */}
        <div className="space-y-2">
          <Label htmlFor="dimension">Dimension</Label>
          <input
            id="dimension"
            type="number"
            value={draftCollection.dimensionOverride || ''}
            onChange={(e) => handleDimensionChange(e.target.value)}
            placeholder={selectedEf?.dimensions.toString() || '384'}
            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Auto-populated from embedding function ({selectedEf?.dimensions || 384}). Override if needed.
          </p>
        </div>

        {/* Optional First Document Section */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="add-first-doc"
              checked={showFirstDocument}
              onChange={(e) => handleFirstDocumentToggle(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="add-first-doc" className="cursor-pointer">
              Add first document
            </Label>
          </div>

          {showFirstDocument && draftCollection.firstDocument && (
            <div className="ml-6 space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-1.5">
                <Label htmlFor="first-doc-id" className="text-xs">
                  Document ID
                </Label>
                <input
                  id="first-doc-id"
                  type="text"
                  value={draftCollection.firstDocument.id}
                  onChange={(e) =>
                    updateDraft({
                      firstDocument: { ...draftCollection.firstDocument!, id: e.target.value },
                    })
                  }
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="first-doc-text" className="text-xs">
                  Document Text
                </Label>
                <textarea
                  id="first-doc-text"
                  value={draftCollection.firstDocument.document}
                  onChange={(e) =>
                    updateDraft({
                      firstDocument: { ...draftCollection.firstDocument!, document: e.target.value },
                    })
                  }
                  rows={4}
                  placeholder="Enter document text..."
                  className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-background">
        <div className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Cmd+S</kbd> to save,{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> to cancel
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={cancelCreation} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={saveDraft} disabled={isCreating || !draftCollection.name.trim()}>
            {isCreating ? 'Creating...' : 'Create Collection'}
          </Button>
        </div>
      </div>
    </div>
  )
}

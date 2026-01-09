import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Label } from '../ui/label'

// Predefined embedding functions with their configurations
const EMBEDDING_FUNCTIONS = [
  {
    id: 'default',
    label: 'Default (MiniLM)',
    type: 'default' as const,
    modelName: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
  {
    id: 'openai-ada',
    label: 'OpenAI Ada',
    type: 'openai' as const,
    modelName: 'text-embedding-ada-002',
    dimensions: 1536,
  },
  {
    id: 'openai-3-small',
    label: 'OpenAI 3-Small',
    type: 'openai' as const,
    modelName: 'text-embedding-3-small',
    dimensions: 1536,
  },
  {
    id: 'openai-3-large',
    label: 'OpenAI 3-Large',
    type: 'openai' as const,
    modelName: 'text-embedding-3-large',
    dimensions: 3072,
  },
]

interface EmbeddingFunctionSelectorProps {
  collectionName: string
  currentOverride: EmbeddingFunctionOverride | null
  serverConfig: { name: string; type: string } | null
  onSave: (override: EmbeddingFunctionOverride) => Promise<void>
  onClear: () => Promise<void>
}

export function EmbeddingFunctionSelector({
  collectionName,
  currentOverride,
  serverConfig,
  onSave,
  onClear,
}: EmbeddingFunctionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Set initial selection based on current override
  useEffect(() => {
    if (currentOverride) {
      const match = EMBEDDING_FUNCTIONS.find(
        ef => ef.type === currentOverride.type && ef.modelName === currentOverride.modelName
      )
      setSelectedId(match?.id || '')
    } else {
      setSelectedId('')
    }
  }, [currentOverride, open])

  const selectedEF = EMBEDDING_FUNCTIONS.find(ef => ef.id === selectedId)

  const handleSave = async () => {
    if (!selectedEF) return

    setSaving(true)
    try {
      await onSave({
        type: selectedEF.type,
        modelName: selectedEF.modelName,
      })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await onClear()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
            currentOverride
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-muted-foreground bg-muted'
          }`}
          title={currentOverride ? 'Override active - Click to change' : 'Click to override embedding function'}
        >
          {currentOverride
            ? `${currentOverride.type}: ${currentOverride.modelName}`
            : serverConfig?.name || 'No EF configured'
          }
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        {/* Header */}
        <div className="mb-4">
          <h4 className="font-medium text-sm">Embedding Function</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Override the embedding function for "{collectionName}"
          </p>
        </div>

        <div className="space-y-4">
          {/* Server config info */}
          <div className="text-sm">
            <Label className="text-muted-foreground text-xs">Server configuration:</Label>
            <p className="mt-1 font-mono text-xs bg-muted px-2 py-1 rounded">
              {serverConfig?.name || 'Not configured'}
            </p>
          </div>

          {/* Current override status */}
          {currentOverride && (
            <div className="text-sm">
              <Label className="text-muted-foreground text-xs">Current override:</Label>
              <p className="mt-1 font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {currentOverride.type}: {currentOverride.modelName}
              </p>
            </div>
          )}

          {/* Selector */}
          <div className="space-y-2">
            <Label htmlFor="ef-select" className="text-xs">Select embedding function:</Label>
            <select
              id="ef-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            >
              <option value="">Choose an embedding function...</option>
              {EMBEDDING_FUNCTIONS.map(ef => (
                <option key={ef.id} value={ef.id}>
                  {ef.label} ({ef.dimensions} dims)
                </option>
              ))}
            </select>
          </div>

          {/* Selected info */}
          {selectedEF && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <p><strong>Type:</strong> {selectedEF.type}</p>
              <p><strong>Model:</strong> {selectedEF.modelName}</p>
              <p><strong>Dimensions:</strong> {selectedEF.dimensions}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          {currentOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={saving}
            >
              Clear Override
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!selectedEF || saving}
          >
            {saving ? 'Saving...' : 'Save Override'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

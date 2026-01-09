import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
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
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionName: string
  profileId: string
  currentOverride: EmbeddingFunctionOverride | null
  serverConfig: { name: string; type: string } | null
  onSave: (override: EmbeddingFunctionOverride) => Promise<void>
  onClear: () => Promise<void>
}

export function EmbeddingFunctionSelector({
  open,
  onOpenChange,
  collectionName,
  currentOverride,
  serverConfig,
  onSave,
  onClear,
}: EmbeddingFunctionSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Set initial selection based on current override or server config
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
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await onClear()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Embedding Function</DialogTitle>
          <DialogDescription>
            Override the embedding function for "{collectionName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Server config info */}
          <div className="text-sm">
            <Label className="text-muted-foreground">Server configuration:</Label>
            <p className="mt-1 font-mono text-xs bg-muted px-2 py-1 rounded">
              {serverConfig?.name || 'Not configured'}
            </p>
          </div>

          {/* Current override status */}
          {currentOverride && (
            <div className="text-sm">
              <Label className="text-muted-foreground">Current override:</Label>
              <p className="mt-1 font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {currentOverride.type}: {currentOverride.modelName}
              </p>
            </div>
          )}

          {/* Selector */}
          <div className="space-y-2">
            <Label htmlFor="ef-select">Select embedding function:</Label>
            <select
              id="ef-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value)
                console.log('value', e.target.value)
              }}
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

        <DialogFooter className="gap-2">
          {currentOverride && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={saving}
            >
              Clear Override
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!selectedEF || saving}
          >
            {saving ? 'Saving...' : 'Save Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

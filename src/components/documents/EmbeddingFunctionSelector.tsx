import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
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
      <PopoverContent className="w-72 p-3" align="start">
        {/* Header */}
        <div className="px-1 mb-3">
          <h4 className="font-medium text-[13px] text-foreground">Embedding Function</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Override for "{collectionName}"
          </p>
        </div>

        <div className="space-y-3">
          {/* Server config info */}
          <div className="px-1">
            <Label className="text-muted-foreground text-[11px] font-normal">Server</Label>
            <p className="font-mono text-[11px] text-foreground/80 mt-0.5">
              {serverConfig?.name || 'Not configured'}
            </p>
          </div>

          {/* Selector */}
          <div className="px-1 space-y-1.5">
            <Label htmlFor="ef-select" className="text-[11px] font-normal">Embedding function</Label>
            <div className="relative">
              <select
                id="ef-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-[22px] appearance-none rounded-[5px] border-none bg-white/10 dark:bg-white/5 pl-2 pr-6 text-[13px] text-foreground shadow-[0_0.5px_1px_rgba(0,0,0,0.1),inset_0_0.5px_0.5px_rgba(255,255,255,0.1)] ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-default"
              >
                <option value="">Select...</option>
                {EMBEDDING_FUNCTIONS.map(ef => (
                  <option key={ef.id} value={ef.id}>
                    {ef.label} ({ef.dimensions}d)
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/70" />
            </div>
          </div>

          {/* Selected info */}
          {(() => {
            const displayEF = selectedEF || EMBEDDING_FUNCTIONS.find(ef => ef.id === 'default')!
            return (
              <div className="mx-1 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-2 rounded-md space-y-0.5">
                <p><span className="text-foreground/70">Type:</span> {displayEF.type}</p>
                <p><span className="text-foreground/70">Model:</span> {displayEF.modelName}</p>
                <p><span className="text-foreground/70">Dimensions:</span> {displayEF.dimensions}</p>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50">
          {currentOverride && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[12px] px-2.5"
              onClick={handleClear}
              disabled={saving}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 text-[12px] px-3"
            onClick={handleSave}
            disabled={!selectedEF || saving}
          >
            {saving ? 'Saving...' : 'Apply'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

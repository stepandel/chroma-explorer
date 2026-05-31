import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { EMBEDDING_FUNCTIONS, EMBEDDING_FUNCTION_GROUPS } from '../../constants/embedding-functions'

interface EmbeddingFunctionSelectorProps {
  collectionName: string
  currentOverride: EmbeddingFunctionOverride | null
  serverConfig: { name: string; type: string; config?: Record<string, unknown> } | null
  onSave: (override: EmbeddingFunctionOverride) => Promise<void>
  onClear: () => Promise<void>
  embeddingDimension?: number | null
}

// Tailwind class set for the toolbar chip, picked to match each provider's
// brand palette. Each entry follows the same shape: bg / text light / text dark
// / border / hover. Kept as full literals so Tailwind picks them up at build.
function providerChipColors(provider: string | undefined): string {
  switch (provider) {
    case 'default':
      // Chroma's local default — neutral slate
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20'
    case 'openai':
      // OpenAI signature green/teal
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
    case 'ollama':
      // Monochrome llama mark — use a warm neutral
      return 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30 hover:bg-stone-500/20'
    case 'cohere':
      // Cohere magenta/coral
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
    case 'google-gemini':
      // Google blue
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
    case 'jina':
      // Jina purple
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
    case 'mistral':
      // Mistral orange-red gradient — amber leans into the yellow side of it
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
    case 'voyageai':
      // Voyage violet
      return 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20'
    case 'together-ai':
      // Together AI vibrant green
      return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20'
    case 'huggingface-server':
      // HF signature yellow (the hugging-face mark)
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
    case 'cloudflare-worker-ai':
      // Cloudflare orange (#F38020)
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
    case 'morph':
      return 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30 hover:bg-pink-500/20'
    case 'chroma-cloud-qwen':
      // Chroma brand teal
      return 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/20'
    case 'sentence-transformer':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'
    default:
      // legacy, unknown, or unset
      return 'text-muted-foreground bg-black/[0.04] border-transparent hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]'
  }
}

function getSelectedEmbeddingId(currentOverride: EmbeddingFunctionOverride | null) {
  if (!currentOverride) return ''
  const match = EMBEDDING_FUNCTIONS.find(
    ef => ef.type === currentOverride.type && ef.modelName === currentOverride.modelName
  )
  return match?.id || ''
}

export function EmbeddingFunctionSelector({
  collectionName,
  currentOverride,
  serverConfig,
  onSave,
  onClear,
  embeddingDimension,
}: EmbeddingFunctionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(() => getSelectedEmbeddingId(currentOverride))
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedId(getSelectedEmbeddingId(currentOverride))
    }
    setOpen(nextOpen)
  }

  const selectedEF = EMBEDDING_FUNCTIONS.find(ef => ef.id === selectedId)

  const serverFunction = EMBEDDING_FUNCTIONS.find(ef => ef.modelName === serverConfig?.config?.model_name)

  const handleSave = async () => {
    if (!selectedEF) return

    setSaving(true)
    try {
      await onSave({
        type: selectedEF.type,
        modelName: selectedEF.modelName,
        url: selectedEF.url,
        accountId: selectedEF.accountId,
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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-embedding-selector
          className={`text-xs px-2 py-0.5 rounded-md cursor-pointer transition-colors border ${providerChipColors(currentOverride?.type ?? serverConfig?.name)}`}
          title={
            currentOverride
              ? `Override: ${currentOverride.type} - Click to change`
              : serverConfig?.name
                ? `Using server embedding function (${serverConfig.name}) - Click to override`
                : 'Click to override embedding function'
          }
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
            <Label htmlFor="ef-select" className="text-[11px] font-normal">Client Override</Label>
            <div className="relative">
              <select
                id="ef-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-[22px] appearance-none rounded-[5px] border-none bg-white/10 dark:bg-white/5 pl-2 pr-6 text-[13px] text-foreground shadow-[0_0.5px_1px_rgba(0,0,0,0.1),inset_0_0.5px_0.5px_rgba(255,255,255,0.1)] ring-1 ring-black/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-default"
              >
                <option value="">Select…</option>
                {EMBEDDING_FUNCTION_GROUPS.map(group => (
                  <optgroup key={group} label={group}>
                    {EMBEDDING_FUNCTIONS.filter(ef => ef.group === group).map(ef => (
                      <option key={ef.id} value={ef.id}>
                        {ef.label} {ef.dimensions ? `(${ef.dimensions}d)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/70" />
            </div>
          </div>

          {/* Selected info */}
          {(() => {
            const displayEF = selectedEF || serverFunction || EMBEDDING_FUNCTIONS.find(ef => ef.id === 'default')!
            const hasDimensionMismatch = selectedEF && embeddingDimension && selectedEF.dimensions && selectedEF.dimensions !== embeddingDimension

            // Determine container styling based on state
            let containerClass = 'bg-black/[0.03] dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.05)]'
            let accentColor = ''

            if (selectedEF) {
              if (hasDimensionMismatch) {
                // Red for dimension mismatch
                containerClass = 'bg-[#FF3B30]/8 dark:bg-[#FF453A]/10 ring-1 ring-[#FF3B30]/20 dark:ring-[#FF453A]/25 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.1)]'
                accentColor = 'text-[#FF3B30] dark:text-[#FF453A]'
              } else {
                // Blue for valid override
                containerClass = 'bg-[#007AFF]/8 dark:bg-[#0A84FF]/10 ring-1 ring-[#007AFF]/20 dark:ring-[#0A84FF]/25 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.1)]'
                accentColor = 'text-[#007AFF] dark:text-[#0A84FF]'
              }
            }

            return (
              <div className={`mx-1 text-[11px] px-2.5 py-2 rounded-[5px] space-y-0.5 ${containerClass}`}>
                {selectedEF && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`size-1.5 rounded-full ${hasDimensionMismatch ? 'bg-[#FF3B30] dark:bg-[#FF453A]' : 'bg-[#007AFF] dark:bg-[#0A84FF]'}`} />
                    <span className={`font-medium text-[10px] ${accentColor}`}>
                      {hasDimensionMismatch ? 'Dimension Mismatch' : 'Client Override'}
                    </span>
                  </div>
                )}
                <p className="text-muted-foreground"><span className="text-foreground/60">Type:</span> {displayEF.type}</p>
                <p className="text-muted-foreground"><span className="text-foreground/60">Model:</span> {displayEF.modelName}</p>
                <p className="text-muted-foreground"><span className="text-foreground/60">Dimensions:</span> {displayEF.dimensions ?? 'variable'}</p>
                {embeddingDimension && (
                  <p className="text-muted-foreground pt-1 border-t border-black/5 dark:border-white/5 mt-1">
                    <span className="text-foreground/60">Collection:</span> {embeddingDimension}d
                  </p>
                )}
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-3 pt-3">
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
            {saving ? 'Saving…' : 'Apply'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

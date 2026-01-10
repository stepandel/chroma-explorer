import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SemanticSearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function SemanticSearchInput({
  value,
  onChange,
}: SemanticSearchInputProps) {
  return (
    <div className="space-y-2">
      <Label className="block">Semantic Search</Label>
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Find similar documents..."
          className="w-full h-6 text-[11px] py-0 px-1.5 pr-5 placeholder:text-[11px]"
          style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs w-4 h-4 flex items-center justify-center"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

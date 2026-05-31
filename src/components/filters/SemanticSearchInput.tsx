interface SemanticSearchInputProps {
  value: string
  onChange: (value: string) => void
}

const inputClassName = "w-full h-6 text-[11px] py-0 px-1.5 pr-5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function SemanticSearchInput({
  value,
  onChange,
}: SemanticSearchInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="semantic-search-input" className="block text-sm font-medium">Semantic Search</label>
      <div className="relative">
        <input
          id="semantic-search-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Find similar documents..."
          className={inputClassName}
          style={inputStyle}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs size-4 flex items-center justify-center"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

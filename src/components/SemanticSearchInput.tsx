interface SemanticSearchInputProps {
  value: string
  nResults: number
  onChange: (value: string) => void
  onNResultsChange: (n: number) => void
}

export function SemanticSearchInput({
  value,
  nResults,
  onChange,
  onNResultsChange,
}: SemanticSearchInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Semantic Search</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Find similar documents..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={nResults}
          onChange={(e) => onNResultsChange(parseInt(e.target.value, 10))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10 results</option>
          <option value={25}>25 results</option>
          <option value={50}>50 results</option>
          <option value={100}>100 results</option>
        </select>
      </div>
    </div>
  )
}

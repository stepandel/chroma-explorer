interface FilterChipProps {
  type: 'query' | 'metadata'
  label: string
  onRemove: () => void
}

export function FilterChip({ type, label, onRemove }: FilterChipProps) {
  const colorClasses = {
    query: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    metadata: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  }

  const icons = {
    query: '🔍',
    metadata: '📊',
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${colorClasses[type]}`}
    >
      <span>{icons[type]}</span>
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:text-red-600 transition-colors"
        aria-label="Remove filter"
      >
        ✕
      </button>
    </div>
  )
}

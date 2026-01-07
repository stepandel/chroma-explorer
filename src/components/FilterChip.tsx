import { Button } from '@/components/ui/button'

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
      <Button
        onClick={onRemove}
        variant="ghost"
        size="sm"
        className="h-auto p-0 hover:text-red-600 hover:bg-transparent"
        aria-label="Remove filter"
      >
        ✕
      </Button>
    </div>
  )
}

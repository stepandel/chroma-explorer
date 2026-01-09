import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface EmbeddingCellProps {
  embedding: number[] | null
}

export default function EmbeddingCell({ embedding }: EmbeddingCellProps) {
  const [expanded, setExpanded] = useState(false)

  if (!embedding) {
    return <span className="text-muted-foreground italic text-xs">No embedding</span>
  }

  const previewCount = 5
  const hasMore = embedding.length > previewCount

  if (expanded) {
    return (
      <div className="space-y-1">
        <div className="text-xs bg-secondary p-1.5 rounded font-mono max-h-32 overflow-y-auto">
          [{embedding.join(', ')}]
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(false)
          }}
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
        >
          Show less
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono">
        [{embedding.slice(0, previewCount).join(', ')}
        {hasMore && '...'}]
      </span>
      {hasMore && (
        <Button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs whitespace-nowrap"
        >
          +{embedding.length - previewCount} more
        </Button>
      )}
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
      <Label className="block">Semantic Search</Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Find similar documents..."
            className="w-full pr-10"
          />
          {value && (
            <Button
              onClick={() => onChange('')}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              ✕
            </Button>
          )}
        </div>
        <Select
          value={nResults.toString()}
          onValueChange={(value) => onNResultsChange(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 results</SelectItem>
            <SelectItem value="25">25 results</SelectItem>
            <SelectItem value="50">50 results</SelectItem>
            <SelectItem value="100">100 results</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

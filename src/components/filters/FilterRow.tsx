import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FilterRowProps {
  row: FilterRowType
  isFirst: boolean
  isLast: boolean
  canRemove: boolean
  onChange: (id: string, updates: Partial<FilterRowType>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

const operatorLabels: Record<MetadataOperator, string> = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'in',
  $nin: 'not in',
}

export function FilterRow({
  row,
  isFirst,
  isLast,
  canRemove,
  onChange,
  onAdd,
  onRemove,
}: FilterRowProps) {
  const handleTypeChange = (type: string) => {
    if (type === 'search') {
      onChange(row.id, {
        type: 'search',
        searchValue: '',
        metadataKey: undefined,
        operator: undefined,
        metadataValue: undefined,
      })
    } else {
      onChange(row.id, {
        type: 'metadata',
        searchValue: undefined,
        metadataKey: '',
        operator: '$eq',
        metadataValue: '',
      })
    }
  }

  const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

  return (
    <div className="flex gap-2 items-center">
      {/* Type selector */}
      <Select
        value={row.type}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger className="w-24 h-6 text-[11px]">
          <SelectValue placeholder="Filter type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="search">Search</SelectItem>
          <SelectItem value="metadata">Metadata</SelectItem>
        </SelectContent>
      </Select>

      {/* Conditional inputs based on type */}
      {row.type === 'search' ? (
        <Input
          type="text"
          value={row.searchValue || ''}
          onChange={(e) => onChange(row.id, { searchValue: e.target.value })}
          placeholder="Search query..."
          className="flex-1 h-6 text-[11px] py-0 px-1.5 placeholder:text-[11px]"
          style={inputStyle}
        />
      ) : (
        <>
          {/* Metadata key input */}
          <Input
            type="text"
            value={row.metadataKey || ''}
            onChange={(e) => onChange(row.id, { metadataKey: e.target.value })}
            placeholder="Field name"
            className="w-24 h-6 text-[11px] py-0 px-1.5 placeholder:text-[11px]"
            style={inputStyle}
          />
          {/* Operator selector */}
          <Select
            value={row.operator || '$eq'}
            onValueChange={(value) => onChange(row.id, { operator: value as MetadataOperator })}
          >
            <SelectTrigger className="w-16 h-6 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(operatorLabels).map(([op, label]) => (
                <SelectItem key={op} value={op}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Value input */}
          <Input
            type="text"
            value={row.metadataValue || ''}
            onChange={(e) => onChange(row.id, { metadataValue: e.target.value })}
            placeholder="Value"
            className="flex-1 h-6 text-[11px] py-0 px-1.5 placeholder:text-[11px]"
            style={inputStyle}
          />
        </>
      )}

      {/* Add/Remove buttons */}
      <div className="flex gap-1">
        {isLast && (
          <Button
            onClick={onAdd}
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0 text-[11px]"
            title="Add filter"
          >
            +
          </Button>
        )}
        {canRemove && (
          <Button
            onClick={() => onRemove(row.id)}
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0 text-[11px] text-muted-foreground hover:text-destructive"
            title="Remove filter"
          >
            -
          </Button>
        )}
      </div>
    </div>
  )
}

import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'

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

const inputClassName = "h-6 text-[11px] py-0 px-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const selectClassName = "h-6 text-[11px] px-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
const buttonClassName = "h-6 w-6 p-0 text-[11px] rounded-md border border-input bg-background hover:bg-accent"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function FilterRow({
  row,
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

  return (
    <div className="flex gap-2 items-center">
      {/* Type selector */}
      <select
        value={row.type}
        onChange={(e) => handleTypeChange(e.target.value)}
        className={`w-24 ${selectClassName}`}
        style={inputStyle}
      >
        <option value="search">Search</option>
        <option value="metadata">Metadata</option>
      </select>

      {/* Conditional inputs based on type */}
      {row.type === 'search' ? (
        <input
          type="text"
          value={row.searchValue || ''}
          onChange={(e) => onChange(row.id, { searchValue: e.target.value })}
          placeholder="Search query..."
          className={`flex-1 ${inputClassName}`}
          style={inputStyle}
        />
      ) : (
        <>
          {/* Metadata key input */}
          <input
            type="text"
            value={row.metadataKey || ''}
            onChange={(e) => onChange(row.id, { metadataKey: e.target.value })}
            placeholder="Field name"
            className={`w-24 ${inputClassName}`}
            style={inputStyle}
          />
          {/* Operator selector */}
          <select
            value={row.operator || '$eq'}
            onChange={(e) => onChange(row.id, { operator: e.target.value as MetadataOperator })}
            className={`w-18 ${selectClassName}`}
            style={inputStyle}
          >
            {Object.entries(operatorLabels).map(([op, label]) => (
              <option key={op} value={op}>
                {label}
              </option>
            ))}
          </select>
          {/* Value input */}
          <input
            type="text"
            value={row.metadataValue || ''}
            onChange={(e) => onChange(row.id, { metadataValue: e.target.value })}
            placeholder="Value"
            className={`flex-1 ${inputClassName}`}
            style={inputStyle}
          />
        </>
      )}

      {/* Add/Remove buttons */}
      <div className="flex gap-1">
        {isLast && (
          <button
            onClick={onAdd}
            className={buttonClassName}
            title="Add filter"
          >
            +
          </button>
        )}
        {canRemove && (
          <button
            onClick={() => onRemove(row.id)}
            className={`${buttonClassName} text-muted-foreground hover:text-destructive`}
            title="Remove filter"
          >
            -
          </button>
        )}
      </div>
    </div>
  )
}

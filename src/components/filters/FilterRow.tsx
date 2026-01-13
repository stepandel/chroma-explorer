import { FilterRow as FilterRowType, MetadataOperator } from '../../types/filters'

interface FilterRowProps {
  row: FilterRowType
  isFirst: boolean
  isLast: boolean
  canRemove: boolean
  onChange: (id: string, updates: Partial<FilterRowType>) => void
  onAdd: () => void
  onRemove: (id: string) => void
  nResults?: number
  onNResultsChange?: (n: number) => void
  metadataFields?: string[]
}

const operatorLabels: Record<MetadataOperator, string> = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
}

const inputClassName = "h-6 text-[11px] py-0 px-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const selectClassName = "h-6 text-[11px] px-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
const buttonClassName = "h-6 w-6 p-0 text-[11px] rounded-md border border-input bg-background hover:bg-accent"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function FilterRow({
  row,
  isFirst,
  isLast,
  canRemove,
  onChange,
  onAdd,
  onRemove,
  nResults,
  onNResultsChange,
  metadataFields = [],
}: FilterRowProps) {
  const handleTypeChange = (value: string) => {
    if (value === 'search') {
      onChange(row.id, {
        type: 'search',
        searchValue: '',
        metadataKey: undefined,
        operator: undefined,
        metadataValue: undefined,
        selectField: undefined,
        selectValue: undefined,
      })
    } else if (value === 'select:id') {
      onChange(row.id, {
        type: 'select',
        searchValue: undefined,
        metadataKey: undefined,
        operator: undefined,
        metadataValue: undefined,
        selectField: 'id',
        selectValue: '',
      })
    } else {
      // value is a metadata field name
      onChange(row.id, {
        type: 'metadata',
        searchValue: undefined,
        metadataKey: value,
        operator: '$eq',
        metadataValue: '',
        selectField: undefined,
        selectValue: undefined,
      })
    }
  }

  // Get current select value: 'search', 'select:id', or the metadata key
  const selectValue = row.type === 'search'
    ? 'search'
    : row.type === 'select'
      ? `select:${row.selectField || 'id'}`
      : (row.metadataKey || '')

  // Ensure current metadataKey is always in the options (in case filtered docs don't have it)
  const allFields = row.metadataKey && !metadataFields.includes(row.metadataKey)
    ? [row.metadataKey, ...metadataFields]
    : metadataFields

  return (
    <div className="flex gap-2 items-center w-full">
      {/* Type selector */}
      <select
        value={selectValue}
        onChange={(e) => handleTypeChange(e.target.value)}
        className={`w-28 ${selectClassName}`}
        style={inputStyle}
      >
        <optgroup label="Search">
          <option value="search">Query</option>
        </optgroup>
        <optgroup label="Select">
          <option value="select:id">ID</option>
        </optgroup>
        {allFields.length > 0 && (
          <optgroup label="Filter">
            {allFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </optgroup>
        )}
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
      ) : row.type === 'select' ? (
        <input
          type="text"
          value={row.selectValue || ''}
          onChange={(e) => onChange(row.id, { selectValue: e.target.value })}
          placeholder="Document ID..."
          className={`flex-1 ${inputClassName}`}
          style={inputStyle}
        />
      ) : (
        <>
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

      {/* Limit selector - only show on first row */}
      {isFirst && nResults !== undefined && onNResultsChange && (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Limit:</span>
          <select
            value={nResults.toString()}
            onChange={(e) => onNResultsChange(parseInt(e.target.value, 10))}
            className={selectClassName}
            style={inputStyle}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="300">300</option>
            <option value="500">500</option>
            <option value="0">No limit</option>
          </select>
        </div>
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

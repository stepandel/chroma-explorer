import {
  QueryMetadataFilter,
  MetadataOperator,
  getOperatorLabel,
  getOperatorsForType,
} from '../../types/filters'
import { formStyles } from '../../styles/form-controls'

interface MetadataFilterRowProps {
  filter: QueryMetadataFilter
  availableFields: string[]
  fieldTypes: Record<string, 'string' | 'number' | 'boolean'>
  onChange: (id: string, updates: Partial<QueryMetadataFilter>) => void
  onRemove: (id: string) => void
  onAdd?: () => void
  onSearch?: () => void
  isLast?: boolean
}

const inputClassName = formStyles.input
const selectClassName = formStyles.select
const buttonClassName = formStyles.iconButton
const inputStyle = formStyles.inputShadow

export function MetadataFilterRow({
  filter,
  availableFields,
  fieldTypes,
  onChange,
  onRemove,
  onAdd,
  onSearch,
  isLast = false,
}: MetadataFilterRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      e.preventDefault()
      onSearch()
    }
  }

  const fieldType = fieldTypes[filter.field] || 'string'
  const availableOperators = getOperatorsForType(fieldType)

  const handleFieldChange = (newField: string) => {
    const newFieldType = fieldTypes[newField] || 'string'
    const newOperators = getOperatorsForType(newFieldType)

    const updates: Partial<QueryMetadataFilter> = { field: newField }
    if (!newOperators.includes(filter.operator)) {
      updates.operator = '$eq'
    }
    onChange(filter.id, updates)
  }

  const getPlaceholder = (): string => {
    if (filter.operator === '$in' || filter.operator === '$nin') return 'value1, value2, ...'
    if (fieldType === 'number') return 'number'
    if (fieldType === 'boolean') return 'true or false'
    return 'value'
  }

  return (
    <div className="flex gap-2 items-center" data-testid="metadata-filter-row">
      {availableFields.length > 0 ? (
        <select
          aria-label="Metadata filter field"
          value={filter.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className={`w-28 ${selectClassName}`}
          style={inputStyle}
          data-testid="filter-field-select"
        >
          <option value="">Select field…</option>
          {availableFields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          aria-label="Metadata filter field"
          value={filter.field}
          onChange={(e) => onChange(filter.id, { field: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="field name"
          className={`w-28 ${inputClassName}`}
          style={inputStyle}
          data-testid="filter-field-input"
        />
      )}

      <select
        aria-label="Metadata filter operator"
        value={filter.operator}
        onChange={(e) => onChange(filter.id, { operator: e.target.value as MetadataOperator })}
        className={`w-16 ${selectClassName}`}
        style={inputStyle}
        data-testid="filter-operator-select"
      >
        {availableOperators.map((op) => (
          <option key={op} value={op}>
            {getOperatorLabel(op)}
          </option>
        ))}
      </select>

      <input
        type="text"
        aria-label="Metadata filter value"
        value={filter.value}
        onChange={(e) => onChange(filter.id, { value: e.target.value })}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        className={`flex-1 min-w-[100px] ${inputClassName}`}
        style={inputStyle}
        data-testid="filter-value-input"
      />

      <button
        type="button"
        aria-label="Remove metadata filter"
        onClick={() => onRemove(filter.id)}
        className={`${buttonClassName} text-muted-foreground hover:text-destructive`}
        title="Remove filter"
        data-testid="remove-filter-button"
      >
        -
      </button>

      {isLast && onAdd && (
        <button
          type="button"
          aria-label="Add metadata filter"
          onClick={onAdd}
          className={`${buttonClassName} text-muted-foreground`}
          title="Add filter"
          data-testid="add-filter-row-button"
        >
          +
        </button>
      )}
    </div>
  )
}

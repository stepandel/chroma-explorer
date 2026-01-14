import { useState } from 'react'
import { MetadataOperator } from '../../types/filters'

interface MetadataFilterInputProps {
  onAdd: (key: string, operator: MetadataOperator, value: string) => void
}

const operatorLabels: Record<MetadataOperator, string> = {
  $eq: '= (equals)',
  $ne: '≠ (not equals)',
  $gt: '> (greater than)',
  $gte: '≥ (greater or equal)',
  $lt: '< (less than)',
  $lte: '≤ (less or equal)',
}

const inputClassName = "flex-1 h-6 text-[11px] py-0 px-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const selectClassName = "h-6 text-[11px] px-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function MetadataFilterInput({ onAdd }: MetadataFilterInputProps) {
  const [key, setKey] = useState('')
  const [operator, setOperator] = useState<MetadataOperator>('$eq')
  const [value, setValue] = useState('')

  const handleAdd = () => {
    if (key.trim() && value.trim()) {
      onAdd(key.trim(), operator, value.trim())
      setKey('')
      setValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Metadata Filter</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Key (e.g., type)"
          className={inputClassName}
          style={inputStyle}
        />
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value as MetadataOperator)}
          className={selectClassName}
          style={inputStyle}
        >
          {Object.entries(operatorLabels).map(([op, label]) => (
            <option key={op} value={op}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Value"
          className={inputClassName}
          style={inputStyle}
        />
        <button
          onClick={handleAdd}
          disabled={!key.trim() || !value.trim()}
          className="h-6 text-[11px] px-2 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

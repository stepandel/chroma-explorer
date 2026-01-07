import { useState } from 'react'
import { MetadataOperator } from '../types/filters'

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
  $in: 'in (comma-separated)',
  $nin: 'not in (comma-separated)',
}

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Metadata Filter</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Key (e.g., type)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value as MetadataOperator)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          onKeyPress={handleKeyPress}
          placeholder="Value"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!key.trim() || !value.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

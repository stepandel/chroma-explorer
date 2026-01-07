import { useState } from 'react'
import { MetadataOperator } from '../types/filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
      <Label className="block">Metadata Filter</Label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Key (e.g., type)"
          className="flex-1"
        />
        <Select
          value={operator}
          onValueChange={(value) => setOperator(value as MetadataOperator)}
        >
          <SelectTrigger className="w-[200px]">
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
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Value"
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={!key.trim() || !value.trim()}
        >
          + Add
        </Button>
      </div>
    </div>
  )
}

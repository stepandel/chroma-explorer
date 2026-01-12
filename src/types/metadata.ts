// Metadata value types supported by ChromaDB
export type MetadataValueType = 'string' | 'number' | 'boolean'

// A metadata field with explicit type information
export interface TypedMetadataField {
  value: string
  type: MetadataValueType
}

// Record of metadata fields with type information (used during draft creation)
export type TypedMetadataRecord = Record<string, TypedMetadataField>

// Validate a value against its declared type
export function validateMetadataValue(value: string, type: MetadataValueType): string | null {
  const trimmed = value.trim()

  if (trimmed === '') {
    return null // Empty is allowed
  }

  switch (type) {
    case 'number':
      if (isNaN(Number(trimmed))) {
        return 'Must be a valid number'
      }
      return null
    case 'boolean':
      if (trimmed.toLowerCase() !== 'true' && trimmed.toLowerCase() !== 'false') {
        return 'Must be "true" or "false"'
      }
      return null
    case 'string':
    default:
      return null
  }
}

// Convert typed metadata to ChromaDB format (actual typed values)
export function typedMetadataToChromaFormat(
  metadata: TypedMetadataRecord | Record<string, unknown>
): Record<string, string | number | boolean> | undefined {
  const entries = Object.entries(metadata).filter(([_, field]) => {
    // Handle both typed fields and plain values
    if (field && typeof field === 'object' && 'value' in field) {
      const typedField = field as TypedMetadataField
      return typedField.value?.trim() !== ''
    }
    // Plain value - treat as string
    return field !== undefined && field !== null && String(field).trim() !== ''
  })

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(
    entries.map(([key, field]) => {
      // Handle typed field
      if (field && typeof field === 'object' && 'value' in field && 'type' in field) {
        const typedField = field as TypedMetadataField
        const trimmed = typedField.value.trim()
        switch (typedField.type) {
          case 'number':
            return [key, Number(trimmed)]
          case 'boolean':
            return [key, trimmed.toLowerCase() === 'true']
          case 'string':
          default:
            return [key, trimmed]
        }
      }
      // Handle plain value - try to infer type
      const strValue = String(field).trim()
      const num = Number(strValue)
      if (!isNaN(num) && strValue !== '') return [key, num]
      if (strValue.toLowerCase() === 'true') return [key, true]
      if (strValue.toLowerCase() === 'false') return [key, false]
      return [key, strValue]
    })
  )
}

// Convert simple string metadata to typed format (for existing documents)
export function stringMetadataToTyped(
  metadata: Record<string, string>,
  typeHints?: Record<string, MetadataValueType>
): TypedMetadataRecord {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      {
        value,
        type: typeHints?.[key] || 'string',
      },
    ])
  )
}

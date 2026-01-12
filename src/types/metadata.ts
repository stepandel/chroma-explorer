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
  metadata: TypedMetadataRecord
): Record<string, string | number | boolean> | undefined {
  const entries = Object.entries(metadata).filter(([_, field]) => field.value.trim() !== '')

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(
    entries.map(([key, field]) => {
      const trimmed = field.value.trim()
      switch (field.type) {
        case 'number':
          return [key, Number(trimmed)]
        case 'boolean':
          return [key, trimmed.toLowerCase() === 'true']
        case 'string':
        default:
          return [key, trimmed]
      }
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

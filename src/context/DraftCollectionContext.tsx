import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useChromaDB } from '../providers/ChromaDBProvider'
import { useCreateCollectionMutation } from '../hooks/useChromaQueries'
import { useCollection } from './CollectionContext'
import { EMBEDDING_FUNCTIONS } from '../constants/embedding-functions'
import { TypedMetadataRecord, typedMetadataToChromaFormat } from '../types/metadata'

export interface DraftCollection {
  name: string
  embeddingFunctionId: string
  dimensionOverride: string // String to allow empty input for auto
  // Optional first document (metadata here defines the collection's schema)
  firstDocument: {
    id: string
    document: string
    metadata: TypedMetadataRecord
  } | null
}

interface DraftCollectionContextValue {
  draftCollection: DraftCollection | null
  isCreating: boolean
  validationErrors: Record<string, string>

  // Actions
  startCreation: () => void
  updateDraft: (updates: Partial<DraftCollection>) => void
  cancelCreation: () => void
  saveDraft: () => Promise<void>
}

const DraftCollectionContext = createContext<DraftCollectionContextValue | null>(null)

interface DraftCollectionProviderProps {
  children: ReactNode
}

const DEFAULT_EF = EMBEDDING_FUNCTIONS[0]

function createInitialDraft(): DraftCollection {
  return {
    name: '',
    embeddingFunctionId: DEFAULT_EF.id,
    dimensionOverride: '',
    firstDocument: null,
  }
}

export function DraftCollectionProvider({ children }: DraftCollectionProviderProps) {
  const [draftCollection, setDraftCollection] = useState<DraftCollection | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const { currentProfile } = useChromaDB()
  const { setActiveCollection } = useCollection()
  const createMutation = useCreateCollectionMutation(currentProfile?.id || '')

  const startCreation = useCallback(() => {
    setDraftCollection(createInitialDraft())
    setValidationErrors({})
    // Deselect current collection when starting creation
    setActiveCollection(null)
  }, [setActiveCollection])

  const updateDraft = useCallback((updates: Partial<DraftCollection>) => {
    setDraftCollection((prev) => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })
    // Clear validation errors for updated fields
    if (updates.name !== undefined) {
      setValidationErrors((prev) => {
        const { name, ...rest } = prev
        return rest
      })
    }
  }, [])

  const cancelCreation = useCallback(() => {
    setDraftCollection(null)
    setValidationErrors({})
  }, [])

  const saveDraft = useCallback(async () => {
    if (!draftCollection || !currentProfile) return

    // Validate
    const errors: Record<string, string> = {}
    if (!draftCollection.name.trim()) {
      errors.name = 'Collection name is required'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsCreating(true)
    try {
      const selectedEf = EMBEDDING_FUNCTIONS.find((ef) => ef.id === draftCollection.embeddingFunctionId) || DEFAULT_EF

      // Parse dimension override
      let dimension: number | undefined
      if (draftCollection.dimensionOverride.trim()) {
        const parsed = parseInt(draftCollection.dimensionOverride, 10)
        if (!isNaN(parsed) && parsed > 0) {
          dimension = parsed
        }
      }

      // Build params
      const params: Parameters<typeof createMutation.mutateAsync>[0] = {
        name: draftCollection.name.trim(),
        embeddingFunction: {
          type: selectedEf.type,
          modelName: selectedEf.modelName,
        },
      }

      // Add first document if provided
      if (draftCollection.firstDocument && draftCollection.firstDocument.id.trim()) {
        params.firstDocument = {
          id: draftCollection.firstDocument.id.trim(),
          document: draftCollection.firstDocument.document || undefined,
          metadata: typedMetadataToChromaFormat(draftCollection.firstDocument.metadata),
        }
      }

      await createMutation.mutateAsync(params)

      // Success: clear draft and select new collection
      const newCollectionName = draftCollection.name.trim()
      setDraftCollection(null)
      setValidationErrors({})
      setActiveCollection(newCollectionName)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create collection'
      setValidationErrors({ _form: message })
    } finally {
      setIsCreating(false)
    }
  }, [draftCollection, currentProfile, createMutation, setActiveCollection])

  const value: DraftCollectionContextValue = {
    draftCollection,
    isCreating,
    validationErrors,
    startCreation,
    updateDraft,
    cancelCreation,
    saveDraft,
  }

  return <DraftCollectionContext.Provider value={value}>{children}</DraftCollectionContext.Provider>
}

export function useDraftCollection() {
  const context = useContext(DraftCollectionContext)
  if (!context) {
    throw new Error('useDraftCollection must be used within a DraftCollectionProvider')
  }
  return context
}

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useChromaDB } from '../providers/ChromaDBProvider'
import { useCreateCollectionMutation } from '../hooks/useChromaQueries'
import { useCollection } from './CollectionContext'
import { EMBEDDING_FUNCTIONS } from '../constants/embedding-functions'
import { TypedMetadataRecord, typedMetadataToChromaFormat, validateMetadataValue } from '../types/metadata'

export interface DraftHNSWConfig {
  space: 'l2' | 'cosine' | 'ip'
  efConstruction: string // String to allow empty input
  maxNeighbors: string // String to allow empty input
}

export interface DraftPineconeConfig {
  dimension: string // String to allow empty input
  metric: 'cosine' | 'euclidean' | 'dotproduct'
  cloud: 'aws' | 'gcp' | 'azure'
  region: string
}

export interface DraftCollection {
  name: string
  embeddingFunctionId: string
  dimensionOverride: string // String to allow empty input for auto
  hnsw: DraftHNSWConfig
  // Optional first document (metadata here defines the collection's schema)
  firstDocument: {
    id: string
    document: string
    metadata: TypedMetadataRecord
  } | null
  // If copying from an existing collection, this will be set
  sourceCollection?: CollectionInfo
  // Pinecone-specific configuration
  pinecone?: DraftPineconeConfig
}

interface DraftCollectionContextValue {
  draftCollection: DraftCollection | null
  isCreating: boolean
  validationErrors: Record<string, string>

  // Actions
  startCreation: () => void
  startCopyFromCollection: (collection: CollectionInfo) => void
  updateDraft: (updates: Partial<DraftCollection>) => void
  cancelCreation: () => void
  saveDraft: () => Promise<void>
  isCopyMode: boolean
}

const DraftCollectionContext = createContext<DraftCollectionContextValue | null>(null)

interface DraftCollectionProviderProps {
  children: ReactNode
}

const DEFAULT_EF = EMBEDDING_FUNCTIONS[0]

function createInitialDraft(isPinecone: boolean = false): DraftCollection {
  return {
    name: '',
    embeddingFunctionId: DEFAULT_EF.id,
    dimensionOverride: '',
    hnsw: {
      space: 'l2',
      efConstruction: '',
      maxNeighbors: '',
    },
    firstDocument: null,
    // Initialize Pinecone config if connected to Pinecone
    pinecone: isPinecone ? {
      dimension: '',
      metric: 'cosine',
      cloud: 'aws',
      region: 'us-east-1',
    } : undefined,
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
    const isPinecone = currentProfile?.type === 'pinecone'
    setDraftCollection(createInitialDraft(isPinecone))
    setValidationErrors({})
    // Deselect current collection when starting creation
    setActiveCollection(null)
  }, [setActiveCollection, currentProfile])

  const startCopyFromCollection = useCallback((collection: CollectionInfo) => {
    // Find matching embedding function from collection's config
    let embeddingFunctionId: string = DEFAULT_EF.id
    if (collection.embeddingFunction) {
      const efType = collection.embeddingFunction.name === 'openai' ? 'openai' : 'default'
      const efModelName = collection.embeddingFunction.config?.model_name as string | undefined

      // Try to find exact match
      const matchingEf = EMBEDDING_FUNCTIONS.find(
        (ef) => ef.type === efType && ef.modelName === efModelName
      )
      if (matchingEf) {
        embeddingFunctionId = matchingEf.id
      } else {
        // Fall back to first matching type
        const typeMatch = EMBEDDING_FUNCTIONS.find((ef) => ef.type === efType)
        if (typeMatch) {
          embeddingFunctionId = typeMatch.id
        }
      }
    }

    // Extract HNSW config from collection metadata
    const hnsw: DraftHNSWConfig = {
      space: 'l2',
      efConstruction: '',
      maxNeighbors: '',
    }
    if (collection.metadata) {
      if (collection.metadata['hnsw:space']) {
        hnsw.space = collection.metadata['hnsw:space'] as 'l2' | 'cosine' | 'ip'
      }
      if (collection.metadata['hnsw:construction_ef'] !== undefined) {
        hnsw.efConstruction = String(collection.metadata['hnsw:construction_ef'])
      }
      if (collection.metadata['hnsw:M'] !== undefined) {
        hnsw.maxNeighbors = String(collection.metadata['hnsw:M'])
      }
    }

    setDraftCollection({
      name: `${collection.name}-copy`,
      embeddingFunctionId,
      dimensionOverride: '',
      hnsw,
      firstDocument: null,
      sourceCollection: collection,
    })
    setValidationErrors({})
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

    const isPinecone = currentProfile.type === 'pinecone'

    // Validate
    const errors: Record<string, string> = {}
    if (!draftCollection.name.trim()) {
      errors.name = isPinecone ? 'Index name is required' : 'Collection name is required'
    }

    // Validate Pinecone-specific fields
    if (isPinecone && draftCollection.pinecone) {
      if (!draftCollection.pinecone.dimension.trim()) {
        errors.dimension = 'Dimension is required for Pinecone indexes'
      } else {
        const dim = parseInt(draftCollection.pinecone.dimension, 10)
        if (isNaN(dim) || dim <= 0) {
          errors.dimension = 'Dimension must be a positive number'
        }
      }
    }

    // Validate first document metadata types
    if (draftCollection.firstDocument) {
      for (const [key, field] of Object.entries(draftCollection.firstDocument.metadata)) {
        const error = validateMetadataValue(field.value, field.type)
        if (error) {
          errors[`metadata.${key}`] = `${key}: ${error}`
        }
      }
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

      // Add HNSW config if any non-default values are set
      const hnswConfig: HNSWConfig = {}
      if (draftCollection.hnsw.space !== 'l2') {
        hnswConfig.space = draftCollection.hnsw.space
      }
      if (draftCollection.hnsw.efConstruction.trim()) {
        const parsed = parseInt(draftCollection.hnsw.efConstruction, 10)
        if (!isNaN(parsed) && parsed > 0) {
          hnswConfig.efConstruction = parsed
        }
      }
      if (draftCollection.hnsw.maxNeighbors.trim()) {
        const parsed = parseInt(draftCollection.hnsw.maxNeighbors, 10)
        if (!isNaN(parsed) && parsed > 0) {
          hnswConfig.maxNeighbors = parsed
        }
      }
      if (Object.keys(hnswConfig).length > 0) {
        params.hnsw = hnswConfig
      }

      // Add Pinecone config if present
      if (isPinecone && draftCollection.pinecone) {
        const dim = parseInt(draftCollection.pinecone.dimension, 10)
        params.pinecone = {
          dimension: dim,
          metric: draftCollection.pinecone.metric,
          cloud: draftCollection.pinecone.cloud,
          region: draftCollection.pinecone.region,
        }
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
    startCopyFromCollection,
    updateDraft,
    cancelCreation,
    saveDraft,
    isCopyMode: draftCollection?.sourceCollection !== undefined,
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

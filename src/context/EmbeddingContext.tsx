import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useChromaDB } from '../providers/ChromaDBProvider'
import { useCollection } from './CollectionContext'
import { useCollectionsQuery } from '../hooks/useChromaQueries'

interface ServerEmbeddingConfig {
  name: string
  type: 'known' | 'legacy' | 'unknown'
  config?: Record<string, unknown>
}

interface EmbeddingContextType {
  // Server-side config from collection metadata
  serverConfig: ServerEmbeddingConfig | null

  // Client-side override (persisted per profile/collection)
  clientOverride: EmbeddingFunctionOverride | null

  // The active config (client override takes precedence)
  activeConfig: {
    type: 'server' | 'client'
    config: ServerEmbeddingConfig | EmbeddingFunctionOverride | null
  }

  // Actions
  setOverride: (override: EmbeddingFunctionOverride) => Promise<void>
  clearOverride: () => Promise<void>

  // Loading state
  isLoading: boolean
}

const EmbeddingContext = createContext<EmbeddingContextType | undefined>(undefined)

export function EmbeddingProvider({ children }: { children: ReactNode }) {
  const { currentProfile } = useChromaDB()
  const { activeCollection } = useCollection()
  const { data: collections = [] } = useCollectionsQuery(currentProfile?.id || null)

  const [clientOverride, setClientOverride] = useState<EmbeddingFunctionOverride | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get server config from collection metadata
  const currentCollection = collections.find(c => c.name === activeCollection)
  const serverConfig: ServerEmbeddingConfig | null = currentCollection?.embeddingFunction || null

  // Fetch client override when collection changes
  useEffect(() => {
    const fetchOverride = async () => {
      if (!currentProfile?.id || !activeCollection) {
        setClientOverride(null)
        return
      }

      setIsLoading(true)
      try {
        const override = await window.electronAPI.profiles.getEmbeddingOverride(
          currentProfile.id,
          activeCollection
        )
        setClientOverride(override)
      } catch (err) {
        console.error('Failed to fetch embedding override:', err)
        setClientOverride(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverride()
  }, [currentProfile?.id, activeCollection])

  const setOverride = useCallback(async (override: EmbeddingFunctionOverride) => {
    if (!currentProfile?.id || !activeCollection) return

    await window.electronAPI.profiles.setEmbeddingOverride(
      currentProfile.id,
      activeCollection,
      override
    )
    setClientOverride(override)
  }, [currentProfile?.id, activeCollection])

  const clearOverride = useCallback(async () => {
    if (!currentProfile?.id || !activeCollection) return

    await window.electronAPI.profiles.clearEmbeddingOverride(
      currentProfile.id,
      activeCollection
    )
    setClientOverride(null)
  }, [currentProfile?.id, activeCollection])

  // Determine active config
  const activeConfig: EmbeddingContextType['activeConfig'] = clientOverride
    ? { type: 'client', config: clientOverride }
    : { type: 'server', config: serverConfig }

  return (
    <EmbeddingContext.Provider
      value={{
        serverConfig,
        clientOverride,
        activeConfig,
        setOverride,
        clearOverride,
        isLoading,
      }}
    >
      {children}
    </EmbeddingContext.Provider>
  )
}

export function useEmbedding() {
  const context = useContext(EmbeddingContext)
  if (context === undefined) {
    throw new Error('useEmbedding must be used within an EmbeddingProvider')
  }
  return context
}

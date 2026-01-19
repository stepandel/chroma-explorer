import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { ConnectionProfile, DocumentRecord, SearchDocumentsParams, DatabaseBackend } from '../../electron/types'
import { useCollectionsQuery, useConnectMutation, useRefreshCollectionsMutation } from '../hooks/useVectorDBQueries'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Schema describing which base fields are available for the current database type.
 * This allows components to render appropriately without checking database type directly.
 */
export interface DocumentSchema {
  /** Database backend type */
  backend: DatabaseBackend
  /** Whether the database has a first-class 'document' text field (Chroma: yes, Pinecone: no) */
  hasDocumentField: boolean
  /** How embeddings are generated: from 'document' field or from a user-selected 'metadata' field */
  embedSource: 'document' | 'metadata'
}

interface VectorDBContextValue {
  // Connection state
  currentProfile: ConnectionProfile | null
  isConnected: boolean
  connect: (profile: ConnectionProfile) => Promise<void>
  disconnect: () => void

  // Document schema (derived from database type)
  documentSchema: DocumentSchema

  // Embed field persistence (for databases that embed from metadata, e.g., Pinecone)
  getEmbedField: (collectionName: string) => Promise<string | undefined>
  setEmbedField: (collectionName: string, field: string) => Promise<void>

  // Collections
  collections: any[]
  collectionsLoading: boolean
  collectionsError: string | null
  refreshCollections: () => Promise<void>

  // Documents (per tab)
  searchDocuments: (params: SearchDocumentsParams) => Promise<DocumentRecord[]>

  // Cache management
  invalidateCache: () => void
}

const VectorDBContext = createContext<VectorDBContextValue | null>(null)

interface VectorDBProviderProps {
  profile: ConnectionProfile
  windowId: string // For future use if needed
  children: ReactNode
}

export function VectorDBProvider({ profile, windowId, children }: VectorDBProviderProps) {
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(profile)
  const [isConnected, setIsConnected] = useState(false)
  const queryClient = useQueryClient()

  // Use React Query for collections
  const {
    data: collections = [],
    isLoading: collectionsLoading,
    error: collectionsError,
  } = useCollectionsQuery(currentProfile?.id || null, isConnected)

  // Connect mutation
  const connectMutation = useConnectMutation()
  const refreshMutation = useRefreshCollectionsMutation(currentProfile?.id || '')

  const connect = useCallback(async (newProfile: ConnectionProfile) => {
    try {
      await connectMutation.mutateAsync(newProfile)
      setCurrentProfile(newProfile)
      setIsConnected(true)
    } catch (error) {
      setIsConnected(false)
      throw error
    }
  }, [connectMutation])

  const disconnect = useCallback(() => {
    setCurrentProfile(null)
    setIsConnected(false)
    // Clear all queries for this profile
    if (currentProfile) {
      queryClient.removeQueries({ queryKey: ['vectordb', 'collections', currentProfile.id] })
      queryClient.removeQueries({ queryKey: ['vectordb', 'documents', currentProfile.id] })
    }
  }, [currentProfile, queryClient])

  const refreshCollections = useCallback(async () => {
    if (!currentProfile) return
    await refreshMutation.mutateAsync()
  }, [currentProfile, refreshMutation])

  const searchDocuments = useCallback(async (params: SearchDocumentsParams): Promise<DocumentRecord[]> => {
    if (!currentProfile) {
      throw new Error('Not connected to database')
    }

    // Fetch documents directly (React Query will cache at component level)
    try {
      const results = await window.electronAPI.chromadb.searchDocuments(currentProfile.id, params)
      return results
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }, [currentProfile])

  const invalidateCache = useCallback(() => {
    if (currentProfile) {
      queryClient.invalidateQueries({ queryKey: ['vectordb', 'documents', currentProfile.id] })
    }
  }, [currentProfile, queryClient])

  // Get persisted embed field for a collection
  const getEmbedField = useCallback(async (collectionName: string): Promise<string | undefined> => {
    if (!currentProfile?.id) return undefined
    try {
      const override = await window.electronAPI.profiles.getEmbeddingOverride(
        currentProfile.id,
        collectionName
      )
      return override?.embedField
    } catch (err) {
      console.error('Failed to get embed field:', err)
      return undefined
    }
  }, [currentProfile?.id])

  // Persist embed field for a collection
  const setEmbedField = useCallback(async (collectionName: string, field: string): Promise<void> => {
    if (!currentProfile?.id) return
    try {
      // Get existing override to preserve other settings
      const existingOverride = await window.electronAPI.profiles.getEmbeddingOverride(
        currentProfile.id,
        collectionName
      )
      // Merge with new embedField
      await window.electronAPI.profiles.setEmbeddingOverride(
        currentProfile.id,
        collectionName,
        {
          ...existingOverride,
          type: existingOverride?.type || 'default',
          embedField: field,
        }
      )
    } catch (err) {
      console.error('Failed to set embed field:', err)
    }
  }, [currentProfile?.id])

  // Auto-connect when profile changes or on initial mount
  useEffect(() => {
    if (profile && (profile !== currentProfile || !isConnected)) {
      connect(profile).catch(console.error)
    }
  }, [profile, currentProfile, isConnected, connect])

  // Listen for Cmd+R refresh (via custom window event) - only refresh documents
  useEffect(() => {
    const handleRefresh = () => {
      if (currentProfile) {
        queryClient.resetQueries({ queryKey: ['vectordb', 'documents', currentProfile.id] })
      }
    }
    window.addEventListener('chroma:refresh', handleRefresh)
    return () => window.removeEventListener('chroma:refresh', handleRefresh)
  }, [currentProfile, queryClient])

  // Derive document schema from database type
  const documentSchema = useMemo((): DocumentSchema => {
    const backend = currentProfile?.type || 'chroma'
    if (backend === 'pinecone') {
      return {
        backend: 'pinecone',
        hasDocumentField: false,
        embedSource: 'metadata',
      }
    }
    // Default: Chroma
    return {
      backend: 'chroma',
      hasDocumentField: true,
      embedSource: 'document',
    }
  }, [currentProfile?.type])

  const value: VectorDBContextValue = {
    currentProfile,
    isConnected,
    connect,
    disconnect,
    documentSchema,
    getEmbedField,
    setEmbedField,
    collections,
    collectionsLoading,
    collectionsError: collectionsError ? (collectionsError as Error).message : null,
    refreshCollections,
    searchDocuments,
    invalidateCache,
  }

  return (
    <VectorDBContext.Provider value={value}>
      {children}
    </VectorDBContext.Provider>
  )
}

export function useVectorDB() {
  const context = useContext(VectorDBContext)
  if (!context) {
    throw new Error('useVectorDB must be used within a VectorDBProvider')
  }
  return context
}

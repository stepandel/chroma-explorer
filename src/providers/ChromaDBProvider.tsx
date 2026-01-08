import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ConnectionProfile, DocumentRecord, SearchDocumentsParams } from '../../electron/types'
import { useCollectionsQuery, useConnectMutation, useRefreshCollectionsMutation } from '../hooks/useChromaQueries'
import { useQueryClient } from '@tanstack/react-query'

interface ChromaDBContextValue {
  // Connection state
  currentProfile: ConnectionProfile | null
  isConnected: boolean
  connect: (profile: ConnectionProfile) => Promise<void>
  disconnect: () => void

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

const ChromaDBContext = createContext<ChromaDBContextValue | null>(null)

interface ChromaDBProviderProps {
  profile: ConnectionProfile
  windowId: string // For future use if needed
  children: ReactNode
}

export function ChromaDBProvider({ profile, windowId, children }: ChromaDBProviderProps) {
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
      queryClient.removeQueries({ queryKey: ['chroma', 'collections', currentProfile.id] })
      queryClient.removeQueries({ queryKey: ['chroma', 'documents', currentProfile.id] })
    }
  }, [currentProfile, queryClient])

  const refreshCollections = useCallback(async () => {
    if (!currentProfile) return
    await refreshMutation.mutateAsync()
  }, [currentProfile, refreshMutation])

  const searchDocuments = useCallback(async (params: SearchDocumentsParams): Promise<DocumentRecord[]> => {
    if (!currentProfile) {
      throw new Error('Not connected to ChromaDB')
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
      queryClient.invalidateQueries({ queryKey: ['chroma', 'documents', currentProfile.id] })
    }
  }, [currentProfile, queryClient])

  // Auto-connect when profile changes or on initial mount
  useEffect(() => {
    if (profile && (profile !== currentProfile || !isConnected)) {
      connect(profile).catch(console.error)
    }
  }, [profile, currentProfile, isConnected, connect])

  const value: ChromaDBContextValue = {
    currentProfile,
    isConnected,
    connect,
    disconnect,
    collections,
    collectionsLoading,
    collectionsError: collectionsError ? (collectionsError as Error).message : null,
    refreshCollections,
    searchDocuments,
    invalidateCache,
  }

  return (
    <ChromaDBContext.Provider value={value}>
      {children}
    </ChromaDBContext.Provider>
  )
}

export function useChromaDB() {
  const context = useContext(ChromaDBContext)
  if (!context) {
    throw new Error('useChromaDB must be used within a ChromaDBProvider')
  }
  return context
}

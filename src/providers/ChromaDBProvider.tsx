import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { ConnectionProfile, CollectionInfo, DocumentRecord, SearchDocumentsParams } from '../../electron/types'

interface ChromaDBContextValue {
  // Connection state
  currentProfile: ConnectionProfile | null
  isConnected: boolean
  connect: (profile: ConnectionProfile) => Promise<void>
  disconnect: () => void

  // Collections
  collections: CollectionInfo[]
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
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)

  // Query cache to avoid duplicate requests
  const queryCache = useRef<Map<string, DocumentRecord[]>>(new Map())

  const connect = useCallback(async (newProfile: ConnectionProfile) => {
    try {
      await window.electronAPI.chromadb.connect(newProfile.id, newProfile)
      setCurrentProfile(newProfile)
      setIsConnected(true)
      setCollectionsError(null)

      // Fetch collections after connecting (inline to avoid circular dependency)
      setCollectionsLoading(true)
      try {
        const collectionsList = await window.electronAPI.chromadb.listCollections(newProfile.id)
        setCollections(collectionsList)
      } catch (collError) {
        const errorMessage = collError instanceof Error ? collError.message : 'Failed to fetch collections'
        setCollectionsError(errorMessage)
        console.error('Error fetching collections:', collError)
      } finally {
        setCollectionsLoading(false)
      }
    } catch (error) {
      setIsConnected(false)
      setCollectionsError(error instanceof Error ? error.message : 'Failed to connect')
      throw error
    }
  }, [])

  const disconnect = useCallback(() => {
    setCurrentProfile(null)
    setIsConnected(false)
    setCollections([])
    setCollectionsError(null)
    queryCache.current.clear()
    // Note: Window will close instead of showing modal
  }, [])

  const refreshCollections = useCallback(async () => {
    if (!currentProfile) return

    setCollectionsLoading(true)
    setCollectionsError(null)

    try {
      const collectionsList = await window.electronAPI.chromadb.listCollections(currentProfile.id)
      setCollections(collectionsList)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections'
      setCollectionsError(errorMessage)
      console.error('Error fetching collections:', error)
    } finally {
      setCollectionsLoading(false)
    }
  }, [currentProfile])

  const searchDocuments = useCallback(async (params: SearchDocumentsParams): Promise<DocumentRecord[]> => {
    if (!currentProfile) {
      throw new Error('Not connected to ChromaDB')
    }

    // Create cache key from params
    const cacheKey = JSON.stringify(params)

    // Return cached result if available
    if (queryCache.current.has(cacheKey)) {
      return queryCache.current.get(cacheKey)!
    }

    // Fetch documents
    try {
      const results = await window.electronAPI.chromadb.searchDocuments(currentProfile.id, params)

      // Cache the results
      queryCache.current.set(cacheKey, results)

      return results
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }, [currentProfile])

  const invalidateCache = useCallback(() => {
    queryCache.current.clear()
  }, [])

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
    collectionsError,
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

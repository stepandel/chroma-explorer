import { useState, useEffect, useCallback } from 'react'
import { ConnectionProfile } from '../../electron/types'

interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
}

interface UseChromaDBResult {
  collections: CollectionInfo[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useChromaDB(profile: ConnectionProfile | null): UseChromaDBResult {
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    if (!profile) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if electronAPI is available
      if (!window.electronAPI || !window.electronAPI.chromadb) {
        throw new Error('Electron API not available. Please make sure the app is running in Electron.')
      }

      // Connect to ChromaDB via IPC
      await window.electronAPI.chromadb.connect(profile)

      // Fetch collections via IPC
      const collectionsList = await window.electronAPI.chromadb.listCollections()

      setCollections(collectionsList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to ChromaDB'
      setError(errorMessage)
      console.error('ChromaDB error:', err)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  return {
    collections,
    loading,
    error,
    refetch: fetchCollections,
  }
}

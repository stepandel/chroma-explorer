import { useState, useEffect, useCallback } from 'react'

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

export function useChromaDB(connectionString: string | null): UseChromaDBResult {
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    if (!connectionString) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if electronAPI is available
      if (!window.electronAPI || !window.electronAPI.chromadb) {
        throw new Error('Electron API not available. Please make sure the app is running in Electron.')
      }

      // Parse the connection string to extract host and port
      const url = new URL(connectionString)
      const host = url.hostname
      const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80)

      // Connect to ChromaDB via IPC
      await window.electronAPI.chromadb.connect(host, port)

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
  }, [connectionString])

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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ConnectionProfile, SearchDocumentsParams, UpdateDocumentParams, CreateDocumentParams, DeleteDocumentsParams, CreateCollectionParams } from '../../electron/types'

// Query Keys
export const chromaQueryKeys = {
  all: ['chroma'] as const,
  profile: (profileId: string) => [...chromaQueryKeys.all, 'profile', profileId] as const,
  collections: (profileId: string) => [...chromaQueryKeys.all, 'collections', profileId] as const,
  documents: (profileId: string, params: SearchDocumentsParams) =>
    [...chromaQueryKeys.all, 'documents', profileId, params] as const,
}

// Profile Query
export function useProfileQuery(profileId: string) {
  return useQuery({
    queryKey: chromaQueryKeys.profile(profileId),
    queryFn: async () => {
      const profile = await window.electronAPI.window.getProfile(profileId)
      return profile
    },
    staleTime: Infinity, // Profiles don't change often
  })
}

// Collections Query
export function useCollectionsQuery(profileId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: chromaQueryKeys.collections(profileId || ''),
    queryFn: async () => {
      if (!profileId) {
        throw new Error('Profile ID is required')
      }
      const collections = await window.electronAPI.chromadb.listCollections(profileId)
      return collections
    },
    enabled: enabled && !!profileId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Documents Query
export function useDocumentsQuery(
  profileId: string | null,
  params: SearchDocumentsParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: chromaQueryKeys.documents(profileId || '', params),
    queryFn: async () => {
      if (!profileId) {
        throw new Error('Profile ID is required')
      }
      const documents = await window.electronAPI.chromadb.searchDocuments(profileId, params)
      return documents
    },
    enabled: enabled && !!profileId && !!params.collectionName,
    staleTime: 1000 * 15, // 15 seconds
  })
}

// Connect Mutation
export function useConnectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profile: ConnectionProfile) => {
      await window.electronAPI.chromadb.connect(profile.id, profile)
      return profile
    },
    onSuccess: (profile) => {
      // Invalidate collections to refetch after connection
      queryClient.invalidateQueries({
        queryKey: chromaQueryKeys.collections(profile.id)
      })
    },
  })
}

// Refresh Collections Mutation
export function useRefreshCollectionsMutation(profileId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const collections = await window.electronAPI.chromadb.listCollections(profileId)
      return collections
    },
    onSuccess: (collections) => {
      // Update the cache directly
      queryClient.setQueryData(chromaQueryKeys.collections(profileId), collections)
    },
  })
}

// Update Document Mutation
export function useUpdateDocumentMutation(profileId: string, collectionName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: Omit<UpdateDocumentParams, 'collectionName'>) => {
      await window.electronAPI.chromadb.updateDocument(profileId, {
        collectionName,
        ...params,
      })
    },
    onSuccess: () => {
      // Invalidate all document queries for this collection to refetch updated data
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return (
            key[0] === 'chroma' &&
            key[1] === 'documents' &&
            key[2] === profileId &&
            typeof key[3] === 'object' &&
            key[3] !== null &&
            (key[3] as SearchDocumentsParams).collectionName === collectionName
          )
        },
      })
    },
  })
}

// Create Document Mutation
export function useCreateDocumentMutation(profileId: string, collectionName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: Omit<CreateDocumentParams, 'collectionName'>) => {
      await window.electronAPI.chromadb.createDocument(profileId, {
        collectionName,
        ...params,
      })
    },
    onSuccess: () => {
      // Invalidate all document queries for this collection to refetch with new document
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return (
            key[0] === 'chroma' &&
            key[1] === 'documents' &&
            key[2] === profileId &&
            typeof key[3] === 'object' &&
            key[3] !== null &&
            (key[3] as SearchDocumentsParams).collectionName === collectionName
          )
        },
      })
      // Also invalidate collections to update document count
      queryClient.invalidateQueries({
        queryKey: chromaQueryKeys.collections(profileId),
      })
    },
  })
}

// Delete Documents Mutation
export function useDeleteDocumentsMutation(profileId: string, collectionName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await window.electronAPI.chromadb.deleteDocuments(profileId, {
        collectionName,
        ids,
      })
    },
    onSuccess: () => {
      // Invalidate all document queries for this collection to refetch after deletion
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return (
            key[0] === 'chroma' &&
            key[1] === 'documents' &&
            key[2] === profileId &&
            typeof key[3] === 'object' &&
            key[3] !== null &&
            (key[3] as SearchDocumentsParams).collectionName === collectionName
          )
        },
      })
      // Also invalidate collections to update document count
      queryClient.invalidateQueries({
        queryKey: chromaQueryKeys.collections(profileId),
      })
    },
  })
}

// Create Collection Mutation
export function useCreateCollectionMutation(profileId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateCollectionParams) => {
      return await window.electronAPI.chromadb.createCollection(profileId, params)
    },
    onSuccess: () => {
      // Invalidate collections to refetch with new collection
      queryClient.invalidateQueries({
        queryKey: chromaQueryKeys.collections(profileId),
      })
    },
  })
}


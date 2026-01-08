import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ConnectionProfile, CollectionInfo, DocumentRecord, SearchDocumentsParams } from '../../electron/types'

// Query Keys
export const chromaQueryKeys = {
  all: ['chroma'] as const,
  profile: (profileId: string) => [...chromaQueryKeys.all, 'profile', profileId] as const,
  collections: (profileId: string) => [...chromaQueryKeys.all, 'collections', profileId] as const,
  documents: (profileId: string, params: SearchDocumentsParams) =>
    [...chromaQueryKeys.all, 'documents', profileId, params] as const,
  tabs: (windowId: string) => ['tabs', windowId] as const,
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

// Tabs Persistence
export function useTabsQuery(windowId: string) {
  return useQuery({
    queryKey: chromaQueryKeys.tabs(windowId),
    queryFn: async () => {
      const data = await window.electronAPI.tabs.load(windowId)
      return data
    },
    staleTime: Infinity, // Don't refetch tabs automatically
  })
}

export function useSaveTabsMutation(windowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      await window.electronAPI.tabs.save(windowId, data)
      return data
    },
    onSuccess: (data) => {
      // Update the cache
      queryClient.setQueryData(chromaQueryKeys.tabs(windowId), data)
    },
  })
}

import { contextBridge, ipcRenderer } from 'electron'
import {
  ConnectionProfile,
  CollectionInfo,
  DocumentRecord,
  SearchDocumentsParams,
  UpdateDocumentParams,
  EmbeddingFunctionOverride,
} from './types'

console.log('Preload script is running!')

contextBridge.exposeInMainWorld('electronAPI', {
  chromadb: {
    connect: async (profileId: string, profile: ConnectionProfile): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:connect', profileId, profile)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    listCollections: async (profileId: string): Promise<CollectionInfo[]> => {
      const result = await ipcRenderer.invoke('chromadb:listCollections', profileId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    getDocuments: async (profileId: string, collectionName: string): Promise<DocumentRecord[]> => {
      const result = await ipcRenderer.invoke('chromadb:getDocuments', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    searchDocuments: async (profileId: string, params: SearchDocumentsParams): Promise<DocumentRecord[]> => {
      const result = await ipcRenderer.invoke('chromadb:searchDocuments', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    updateDocument: async (profileId: string, params: UpdateDocumentParams): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:updateDocument', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
  },
  profiles: {
    getAll: async (): Promise<ConnectionProfile[]> => {
      const result = await ipcRenderer.invoke('profiles:getAll')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    save: async (profile: ConnectionProfile): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:save', profile)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    delete: async (id: string): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:delete', id)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    getLastActive: async (): Promise<string | null> => {
      const result = await ipcRenderer.invoke('profiles:getLastActive')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    setLastActive: async (id: string | null): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:setLastActive', id)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    getEmbeddingOverride: async (profileId: string, collectionName: string): Promise<EmbeddingFunctionOverride | null> => {
      const result = await ipcRenderer.invoke('profiles:getEmbeddingOverride', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    setEmbeddingOverride: async (profileId: string, collectionName: string, override: EmbeddingFunctionOverride): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:setEmbeddingOverride', profileId, collectionName, override)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    clearEmbeddingOverride: async (profileId: string, collectionName: string): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:clearEmbeddingOverride', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
  },
  window: {
    createConnection: async (profile: ConnectionProfile): Promise<{ windowId: string }> => {
      const result = await ipcRenderer.invoke('window:create-connection', profile)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    getInfo: async (): Promise<{ type: string; windowId?: string; profileId?: string }> => {
      const result = await ipcRenderer.invoke('window:get-info')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    closeCurrent: async (): Promise<void> => {
      const result = await ipcRenderer.invoke('window:close-current')
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    getProfile: async (profileId: string): Promise<ConnectionProfile> => {
      const result = await ipcRenderer.invoke('window:get-profile', profileId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  },
})

console.log('Preload script finished, electronAPI exposed:', typeof window !== 'undefined' ? !!(window as any).electronAPI : 'window not defined')

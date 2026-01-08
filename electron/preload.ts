import { contextBridge, ipcRenderer } from 'electron'
import {
  ConnectionProfile,
  CollectionInfo,
  DocumentRecord,
  SearchDocumentsParams,
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
  },
  tabs: {
    save: async (windowId: string, data: any): Promise<void> => {
      const result = await ipcRenderer.invoke('tabs:save', windowId, data)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    load: async (windowId: string): Promise<any> => {
      const result = await ipcRenderer.invoke('tabs:load', windowId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    clear: async (windowId: string): Promise<void> => {
      const result = await ipcRenderer.invoke('tabs:clear', windowId)
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

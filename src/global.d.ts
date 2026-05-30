import type {
  CollectionInfo as ContractCollectionInfo,
  ConnectionProfile as ContractConnectionProfile,
  CopyCollectionParams as ContractCopyCollectionParams,
  CopyCollectionResult as ContractCopyCollectionResult,
  CopyProgress as ContractCopyProgress,
  CreateCollectionParams as ContractCreateCollectionParams,
  CreateDocumentParams as ContractCreateDocumentParams,
  CreateDocumentsBatchParams as ContractCreateDocumentsBatchParams,
  DeleteDocumentsParams as ContractDeleteDocumentsParams,
  DocumentRecord as ContractDocumentRecord,
  ElectronAPI as ContractElectronAPI,
  EmbeddingFunctionOverride as ContractEmbeddingFunctionOverride,
  EmbeddingFunctionType as ContractEmbeddingFunctionType,
  HNSWConfig as ContractHNSWConfig,
  SearchDocumentsParams as ContractSearchDocumentsParams,
  UpdateDocumentParams as ContractUpdateDocumentParams,
  UpdateInfo as ContractUpdateInfo,
  UpdateStatus as ContractUpdateStatus,
} from './types/electron'

declare global {
  type EmbeddingFunctionType = ContractEmbeddingFunctionType
  type EmbeddingFunctionOverride = ContractEmbeddingFunctionOverride
  type ConnectionProfile = ContractConnectionProfile
  type CollectionInfo = ContractCollectionInfo
  type DocumentRecord = ContractDocumentRecord
  type SearchDocumentsParams = ContractSearchDocumentsParams
  type UpdateDocumentParams = ContractUpdateDocumentParams
  type CreateDocumentParams = ContractCreateDocumentParams
  type DeleteDocumentsParams = ContractDeleteDocumentsParams
  type CreateDocumentsBatchParams = ContractCreateDocumentsBatchParams
  type HNSWConfig = ContractHNSWConfig
  type CreateCollectionParams = ContractCreateCollectionParams
  type CopyCollectionParams = ContractCopyCollectionParams
  type CopyCollectionResult = ContractCopyCollectionResult
  type CopyProgress = ContractCopyProgress
  type UpdateInfo = ContractUpdateInfo
  type UpdateStatus = ContractUpdateStatus
  type ElectronAPI = ContractElectronAPI

  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}

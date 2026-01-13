import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CollectionClipboard {
  collection: CollectionInfo
  sourceProfileId: string
}

interface ClipboardContextValue {
  clipboard: CollectionClipboard | null
  copyCollection: (collection: CollectionInfo, profileId: string) => void
  clearClipboard: () => void
  hasCopiedCollection: boolean
}

const ClipboardContext = createContext<ClipboardContextValue | null>(null)

interface ClipboardProviderProps {
  children: ReactNode
}

export function ClipboardProvider({ children }: ClipboardProviderProps) {
  const [clipboard, setClipboard] = useState<CollectionClipboard | null>(null)

  const copyCollection = useCallback((collection: CollectionInfo, profileId: string) => {
    setClipboard({ collection, sourceProfileId: profileId })
  }, [])

  const clearClipboard = useCallback(() => {
    setClipboard(null)
  }, [])

  const value: ClipboardContextValue = {
    clipboard,
    copyCollection,
    clearClipboard,
    hasCopiedCollection: clipboard !== null,
  }

  return <ClipboardContext.Provider value={value}>{children}</ClipboardContext.Provider>
}

export function useClipboard() {
  const context = useContext(ClipboardContext)
  if (!context) {
    throw new Error('useClipboard must be used within a ClipboardProvider')
  }
  return context
}

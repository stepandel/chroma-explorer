import { createContext, useContext, useState, ReactNode } from 'react'

interface CollectionContextValue {
  activeCollection: string | null
  setActiveCollection: (collectionName: string | null) => void
}

const CollectionContext = createContext<CollectionContextValue | null>(null)

interface CollectionProviderProps {
  children: ReactNode
}

export function CollectionProvider({ children }: CollectionProviderProps) {
  const [activeCollection, setActiveCollection] = useState<string | null>(null)

  const value: CollectionContextValue = {
    activeCollection,
    setActiveCollection,
  }

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  )
}

export function useCollection() {
  const context = useContext(CollectionContext)
  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider')
  }
  return context
}

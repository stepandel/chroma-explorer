import { useState } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useCollection } from '../../context/CollectionContext'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function CollectionPanel() {
  const { collections, collectionsLoading, collectionsError, refreshCollections } = useChromaDB()
  const { activeCollection, setActiveCollection } = useCollection()
  const [searchTerm, setSearchTerm] = useState('')

  const handleCollectionClick = (collectionName: string) => {
    setActiveCollection(collectionName)
  }

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <aside className="w-full h-full bg-sidebar/70 backdrop-blur-xl flex flex-col">
      {/* Header - with spacing for traffic lights */}
      <div className="pt-14 px-4 pb-2">
        {/* Search input */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-6 text-[11px] py-0 px-1.5 pr-5 placeholder:text-[11px]"
            style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs w-4 h-4 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto">
        {collectionsLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading collections...</div>
        )}

        {collectionsError && (
          <div className="p-4">
            <div className="text-sm text-destructive mb-2">{collectionsError}</div>
            <Button onClick={refreshCollections} size="sm" variant="outline" className="w-full">
              Retry
            </Button>
          </div>
        )}

        {!collectionsLoading && !collectionsError && collections.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No collections found
          </div>
        )}

        {!collectionsLoading && !collectionsError && collections.length > 0 && filteredCollections.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No collections match "{searchTerm}"
          </div>
        )}

        {!collectionsLoading && !collectionsError && filteredCollections.length > 0 && (
          <div className="py-2">
            {filteredCollections.map(collection => {
              const isActive = collection.name === activeCollection
              return (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionClick(collection.name)}
                  className={`w-full px-4 py-1 text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-sidebar-accent border-l-2 border-sidebar-primary'
                      : 'hover:bg-sidebar-accent/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className={`text-xs font-medium truncate ${
                    isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground'
                  }`}>
                    {collection.name}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useCollection } from '../../context/CollectionContext'
import { useDraftCollection } from '../../context/DraftCollectionContext'
import { Button } from '../ui/button'

const inputClassName = "w-full h-6 text-[11px] py-0 px-1.5 pr-5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function CollectionPanel() {
  const { collections, collectionsLoading, collectionsError, refreshCollections } = useChromaDB()
  const { activeCollection, setActiveCollection } = useCollection()
  const { draftCollection, startCreation, updateDraft, cancelCreation } = useDraftCollection()
  const [searchTerm, setSearchTerm] = useState('')

  const handleCollectionClick = (collectionName: string) => {
    // Cancel creation mode if selecting existing collection
    if (draftCollection) {
      cancelCreation()
    }
    setActiveCollection(collectionName)
  }

  const handleCreateClick = () => {
    startCreation()
  }

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <aside className="w-full h-full bg-sidebar/70 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="px-4 py-2">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClassName}
            style={inputStyle}
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

        {/* Draft collection row */}
        {draftCollection && (
          <div className="py-2">
            <div className="w-full px-4 py-1 bg-primary/10 border-l-2 border-primary">
              <input
                type="text"
                value={draftCollection.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="Collection name..."
                className="w-full text-xs font-medium bg-transparent border-none outline-none text-primary placeholder:text-primary/50"
                autoFocus
              />
            </div>
          </div>
        )}

        {!collectionsLoading && !collectionsError && filteredCollections.length > 0 && (
          <div className="py-2">
            {filteredCollections.map(collection => {
              const isActive = collection.name === activeCollection && !draftCollection
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

      {/* Footer with add button */}
      <div className="px-4 py-2 border-t border-sidebar-border">
        <button
          onClick={handleCreateClick}
          disabled={!!draftCollection}
          className="h-6 w-6 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
          title="Create new collection"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </aside>
  )
}

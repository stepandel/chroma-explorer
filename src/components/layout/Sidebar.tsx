import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useCollection } from '../../context/CollectionContext'
import { Button } from '../ui/button'

export function Sidebar() {
  const { collections, collectionsLoading, collectionsError, refreshCollections } = useChromaDB()
  const { activeCollection, setActiveCollection } = useCollection()

  const handleCollectionClick = (collectionName: string) => {
    setActiveCollection(collectionName)
  }

  const handleRefresh = () => {
    refreshCollections()
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      {/* Header - with spacing for traffic lights */}
      <div className="pt-14 px-4 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {collections.length} collection{collections.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={handleRefresh} variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500">
            ↻
          </Button>
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto">
        {collectionsLoading && (
          <div className="p-4 text-sm text-gray-600">Loading collections...</div>
        )}

        {collectionsError && (
          <div className="p-4">
            <div className="text-sm text-red-600 mb-2">{collectionsError}</div>
            <Button onClick={handleRefresh} size="sm" variant="outline" className="w-full">
              Retry
            </Button>
          </div>
        )}

        {!collectionsLoading && !collectionsError && collections.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No collections found
          </div>
        )}

        {!collectionsLoading && !collectionsError && collections.length > 0 && (
          <div className="py-2">
            {collections.map(collection => {
              const isActive = collection.name === activeCollection
              return (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionClick(collection.name)}
                  className={`w-full px-4 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-l-2 border-blue-500'
                      : 'hover:bg-gray-100 border-l-2 border-transparent'
                  }`}
                >
                  <div className={`text-sm font-medium truncate ${
                    isActive ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {collection.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {collection.count.toLocaleString()} docs
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

import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useTabs } from '../../context/TabsContext'
import { Button } from '../ui/button'

export function Sidebar() {
  const { collections, collectionsLoading, collectionsError, refreshCollections } = useChromaDB()
  const { openCollection, sidebarCollapsed } = useTabs()

  const handleCollectionClick = (collectionName: string) => {
    openCollection(collectionName)
  }

  const handleRefresh = () => {
    refreshCollections()
  }

  if (sidebarCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-gray-200 flex flex-col">
        {/* Collapsed sidebar - could show icons */}
      </aside>
    )
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
            {collections.map(collection => (
              <button
                key={collection.id}
                onClick={() => handleCollectionClick(collection.name)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors group"
              >
                <div className="text-sm font-medium text-gray-900 truncate">
                  {collection.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {collection.count.toLocaleString()} docs
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

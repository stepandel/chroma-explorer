import { useTabs } from '../../context/TabsContext'
import { Button } from '../ui/button'

export function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab } = useTabs()

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center px-2 overflow-x-auto">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId

        return (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-t-md min-w-[120px] max-w-[200px]
              cursor-pointer transition-colors border-b-2
              ${isActive
                ? 'bg-white border-blue-500 text-gray-900'
                : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
              }
            `}
            onClick={() => switchTab(tab.id)}
          >
            <span className="flex-1 truncate text-sm font-medium">
              {tab.collectionName}
            </span>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-gray-300 rounded"
            >
              ✕
            </Button>
          </div>
        )
      })}
    </div>
  )
}

import { useTabs } from '../../context/TabsContext'
import DocumentsView from '../DocumentsView'

export function MainContent() {
  const { activeTab } = useTabs()

  if (!activeTab) {
    return (
      <main className="flex-1 overflow-auto flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No collection open</p>
          <p className="text-sm">Select a collection from the sidebar to get started</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto">
      <DocumentsView collectionName={activeTab.collectionName} />
    </main>
  )
}

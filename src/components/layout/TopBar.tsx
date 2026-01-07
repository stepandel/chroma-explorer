import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useTabs } from '../../context/TabsContext'
import { Button } from '../ui/button'

export function TopBar() {
  const { currentProfile, disconnect } = useChromaDB()
  const { createTab } = useTabs()

  const handleNewTab = () => {
    createTab() // Creates a blank tab
  }

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect? This will close all tabs.')) {
      disconnect()
      // App.tsx will handle showing the connection modal again
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
          <span className="text-sm font-medium text-gray-700">
            {currentProfile?.name || 'Connected'}
          </span>
        </div>
        <span className="text-xs text-gray-500">{currentProfile?.url}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleNewTab} size="sm" variant="outline">
          + New Tab
        </Button>
        <Button onClick={handleDisconnect} size="sm" variant="ghost">
          Disconnect
        </Button>
      </div>
    </header>
  )
}

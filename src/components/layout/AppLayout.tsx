import { useEffect } from 'react'
import { useTabs } from '../../context/TabsContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { MainContent } from './MainContent'

export function AppLayout() {
  const { loadState, tabs, createTab } = useTabs()

  // Load persisted tabs on mount
  useEffect(() => {
    const initializeTabs = async () => {
      await loadState()

      // If no tabs were loaded, create a blank tab
      if (tabs.length === 0) {
        createTab()
      }
    }

    initializeTabs()
  }, []) // Only run once on mount

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar />

        {/* Tab Bar */}
        <TabBar />

        {/* Content Area */}
        <MainContent />
      </div>
    </div>
  )
}

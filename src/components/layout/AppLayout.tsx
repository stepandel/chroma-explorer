import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'

export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar />

        {/* Content Area */}
        <MainContent />
      </div>
    </div>
  )
}

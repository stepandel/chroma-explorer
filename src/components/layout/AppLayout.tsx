import { PanelProvider } from '../../context/PanelContext'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'

export function AppLayout() {
  return (
    <PanelProvider>
      <div className="flex flex-col h-screen bg-gray-100">
        <TopBar />
        <MainContent />
      </div>
    </PanelProvider>
  )
}

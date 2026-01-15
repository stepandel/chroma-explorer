import { PanelProvider } from '../../context/PanelContext'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'
import { useMenuHandlers } from '../../hooks/useMenuHandlers'

function AppLayoutContent() {
  // Subscribe to native menu events
  useMenuHandlers()

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--content-background)' }}>
      <TopBar />
      <MainContent />
    </div>
  )
}

export function AppLayout() {
  return (
    <PanelProvider>
      <AppLayoutContent />
    </PanelProvider>
  )
}

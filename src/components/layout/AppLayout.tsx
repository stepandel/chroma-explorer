import { PanelProvider } from '../../context/PanelContext'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'

export function AppLayout() {
  return (
    <PanelProvider>
      <div className="flex flex-col h-screen" style={{ background: 'var(--content-background)' }}>
        <TopBar />
        <MainContent />
      </div>
    </PanelProvider>
  )
}

import { useChromaDB } from '../../providers/ChromaDBProvider'
import { Button } from '../ui/button'
import { PanelRightOpen, PanelRightClose } from 'lucide-react'

interface TopBarProps {
  rightDrawerOpen: boolean
  onToggleRightDrawer: () => void
  hasSelectedDocument: boolean
}

export function TopBar({ rightDrawerOpen, onToggleRightDrawer, hasSelectedDocument }: TopBarProps) {
  const { currentProfile } = useChromaDB()

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect? This will close this window.')) {
      // Close the window - cleanup happens automatically
      await window.electronAPI.window.closeCurrent()
    }
  }

  return (
    <header
      className="h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - Connection info with spacing for traffic lights */}
      <div className="flex items-center gap-3 pl-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
          <span className="text-sm font-semibold text-foreground">
            {currentProfile?.name || 'Connected'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{currentProfile?.url}</span>
      </div>

      {/* Right side - Actions */}
      <div
        className="flex items-center gap-2 pr-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {hasSelectedDocument && (
          <Button
            onClick={onToggleRightDrawer}
            size="sm"
            variant="ghost"
            className="h-7 text-xs flex items-center gap-1.5"
          >
            {rightDrawerOpen ? (
              <>
                <PanelRightClose className="h-3.5 w-3.5" />
                <span>Close Details</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-3.5 w-3.5" />
                <span>Open Details</span>
              </>
            )}
          </Button>
        )}
        <Button onClick={handleDisconnect} size="sm" variant="ghost" className="h-7 text-xs">
          Disconnect
        </Button>
      </div>
    </header>
  )
}

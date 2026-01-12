import { useChromaDB } from '../../providers/ChromaDBProvider'
import { usePanel } from '../../context/PanelContext'
import { Button } from '../ui/button'
import { PanelLeft, PanelRight, PanelLeftDashed, PanelRightDashed } from 'lucide-react'

export function TopBar() {
  const { currentProfile } = useChromaDB()
  const {
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
  } = usePanel()

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
        {/* Left Panel Toggle */}
        <Button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
        >
          {leftPanelOpen ? (
            <PanelLeft className="h-5 w-5 text-primary" />
          ) : (
            <PanelLeftDashed className="h-5 w-5" />
          )}
        </Button>

        {/* Right Panel Toggle */}
        <Button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
        >
          {rightPanelOpen ? (
            <PanelRight className="h-5 w-5 text-primary" />
          ) : (
            <PanelRightDashed className="h-5 w-5" />
          )}
        </Button>

        <Button onClick={handleDisconnect} size="sm" variant="ghost" className="h-7 text-xs">
          Disconnect
        </Button>
      </div>
    </header>
  )
}

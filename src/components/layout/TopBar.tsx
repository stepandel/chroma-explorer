import { useChromaDB } from '../../providers/ChromaDBProvider'
import { usePanel } from '../../context/PanelContext'
import { PanelLeft, PanelRight, PanelLeftDashed, PanelRightDashed, Power } from 'lucide-react'

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

  const iconButtonClass = "h-7 w-7 p-0 flex items-center justify-center rounded-md hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"

  return (
    <header
      className="h-11 flex items-center"
      style={{
        WebkitAppRegion: 'drag',
        background: 'oklch(0.98 0 0 / 50%)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      } as React.CSSProperties}
    >
      {/* Left side - spacing for traffic lights */}
      <div className="w-[76px]" />

      {/* Center - Connection info */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected" />
        <span className="text-[12px] font-medium text-foreground/80">
          {currentProfile?.name || 'Connected'}
        </span>
        <span className="text-[11px] text-foreground/40">{currentProfile?.url}</span>
      </div>

      {/* Right side - Panel toggles + Disconnect */}
      <div
        className="flex items-center gap-0.5 pr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={iconButtonClass}
          title="Toggle sidebar"
        >
          {leftPanelOpen ? (
            <PanelLeft className="h-4 w-4 text-foreground/70" />
          ) : (
            <PanelLeftDashed className="h-4 w-4 text-foreground/40" />
          )}
        </button>
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className={iconButtonClass}
          title="Toggle inspector"
        >
          {rightPanelOpen ? (
            <PanelRight className="h-4 w-4 text-foreground/70" />
          ) : (
            <PanelRightDashed className="h-4 w-4 text-foreground/40" />
          )}
        </button>
        <div className="w-px h-4 bg-foreground/10 mx-1" />
        <button
          onClick={handleDisconnect}
          className={`${iconButtonClass} hover:bg-destructive/10 hover:text-destructive`}
          title="Disconnect"
        >
          <Power className="h-3.5 w-3.5 text-foreground/50" />
        </button>
      </div>
    </header>
  )
}

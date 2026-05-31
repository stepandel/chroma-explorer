import { useEffect, useState } from 'react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { usePanel } from '../../context/PanelContext'
import { PanelLeft, PanelRight, PanelLeftDashed, PanelRightDashed, Power } from 'lucide-react'

type UpdateAvailability = 'available' | 'downloading' | 'downloaded'

export function TopBar() {
  const { currentProfile } = useChromaDB()
  const {
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
  } = usePanel()
  const [updateState, setUpdateState] = useState<UpdateAvailability | null>(null)

  useEffect(() => {
    return window.electronAPI.updater.onStatus((status) => {
      if (
        status.status === 'available' ||
        status.status === 'downloading' ||
        status.status === 'downloaded'
      ) {
        setUpdateState(status.status)
      } else {
        setUpdateState(null)
      }
    })
  }, [])

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect? This will close this window.')) {
      // Close the window - cleanup happens automatically
      await window.electronAPI.window.closeCurrent()
    }
  }

  const handleUpdate = async () => {
    if (updateState === 'downloaded') {
      await window.electronAPI.updater.installUpdate()
    } else {
      await window.electronAPI.updater.checkForUpdatesMenu()
    }
  }

  const iconButtonClass = "h-7 w-7 p-0 flex items-center justify-center rounded-md hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
  const updateLabel = updateState === 'downloading' ? 'Updating…' : 'Update'

  return (
    <header
      className="h-11 flex items-center"
      style={{
        WebkitAppRegion: 'drag',
        background: 'var(--sidebar)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      } as React.CSSProperties}
    >
      {/* Left side - spacing for traffic lights */}
      <div className="w-[76px]" />

      {/* Left toolbar buttons */}
      {updateState && (
        <div
          className="flex items-center gap-0.5 pl-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={handleUpdate}
            disabled={updateState === 'downloading'}
            className="h-7 px-2.5 inline-flex items-center justify-center rounded-md text-[12px] font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
            title={
              updateState === 'downloaded'
                ? 'Restart and install update'
                : updateState === 'downloading'
                ? 'Update is downloading'
                : 'Update available'
            }
          >
            {updateLabel}
          </button>
        </div>
      )}

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

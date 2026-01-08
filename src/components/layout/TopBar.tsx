import { useChromaDB } from '../../providers/ChromaDBProvider'
import { Button } from '../ui/button'

export function TopBar() {
  const { currentProfile } = useChromaDB()

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect? This will close this window.')) {
      // Close the window - cleanup happens automatically
      await window.electronAPI.window.closeCurrent()
    }
  }

  return (
    <header
      className="h-14 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - Connection info with spacing for traffic lights */}
      <div className="flex items-center gap-3 pl-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
          <span className="text-sm font-semibold text-gray-800">
            {currentProfile?.name || 'Connected'}
          </span>
        </div>
        <span className="text-xs text-gray-500">{currentProfile?.url}</span>
      </div>

      {/* Right side - Actions */}
      <div
        className="flex items-center gap-2 pr-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button onClick={handleDisconnect} size="sm" variant="ghost" className="h-7 text-xs text-gray-600">
          Disconnect
        </Button>
      </div>
    </header>
  )
}

import { useWindowInfo } from './hooks/useWindowInfo'
import { SetupWindow } from './windows/SetupWindow'
import { ConnectionWindow } from './windows/ConnectionWindow'
import { SettingsWindow } from './windows/SettingsWindow'

export default function App() {
  const { windowType, windowId, profileId } = useWindowInfo()

  // Route based on window type
  if (windowType === 'setup') {
    return <SetupWindow />
  }

  if (windowType === 'settings') {
    return <SettingsWindow />
  }

  if (windowType === 'connection' && windowId && profileId) {
    return <ConnectionWindow windowId={windowId} profileId={profileId} />
  }

  // Fallback for unknown window type
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-red-600">Error: Unknown window type</div>
    </div>
  )
}

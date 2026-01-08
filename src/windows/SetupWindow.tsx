import ConnectionModal from '../components/ConnectionModal'
import { ConnectionProfile } from '../../electron/types'

export function SetupWindow() {
  const handleConnect = async (profile: ConnectionProfile) => {
    try {
      // Create a new connection window
      await window.electronAPI.window.createConnection(profile)

      // Close the setup window
      await window.electronAPI.window.closeCurrent()
    } catch (error) {
      console.error('Failed to create connection window:', error)
      // Show error to user
      alert(`Failed to create connection window: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return <ConnectionModal isOpen={true} onConnect={handleConnect} />
}

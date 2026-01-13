import { useEffect } from 'react'
import ConnectionModal from '../components/modals/ConnectionModal'
import { ConnectionProfile } from '../../electron/types'

export function SetupWindow() {
  // Make body transparent for vibrancy effect
  useEffect(() => {
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    return () => {
      document.body.style.background = ''
      document.documentElement.style.background = ''
    }
  }, [])

  const handleConnect = async (profile: ConnectionProfile) => {
    try {
      // Create a new connection window (window manager will close setup window)
      await window.electronAPI.window.createConnection(profile)
    } catch (error) {
      console.error('Failed to create connection window:', error)
      // Show error to user
      alert(`Failed to create connection window: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return <ConnectionModal isOpen={true} onConnect={handleConnect} />
}

import { useState, FormEvent, useEffect } from 'react'
import { ConnectionProfile } from '../../electron/types'

interface ConnectionModalProps {
  isOpen: boolean
  onConnect: (profile: ConnectionProfile) => void
}

export default function ConnectionModal({ isOpen, onConnect }: ConnectionModalProps) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [profileName, setProfileName] = useState('')
  const [url, setUrl] = useState('http://localhost:8000')
  const [tenant, setTenant] = useState('')
  const [database, setDatabase] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saveProfile, setSaveProfile] = useState(false)
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Load saved profiles on mount
  useEffect(() => {
    if (isOpen) {
      loadProfiles()
    }
  }, [isOpen])

  const loadProfiles = async () => {
    try {
      const savedProfiles = await window.electronAPI.profiles.getAll()
      setProfiles(savedProfiles)
    } catch (err) {
      console.error('Failed to load profiles:', err)
    }
  }

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId)

    if (!profileId) {
      // Clear form
      resetForm()
      return
    }

    const profile = profiles.find(p => p.id === profileId)
    if (profile) {
      setProfileName(profile.name)
      setUrl(profile.url)
      setTenant(profile.tenant || '')
      setDatabase(profile.database || '')
      setApiKey(profile.apiKey || '')
    }
  }

  const resetForm = () => {
    setProfileName('')
    setUrl('http://localhost:8000')
    setTenant('')
    setDatabase('')
    setApiKey('')
    setSaveProfile(false)
  }

  const handleDeleteProfile = async () => {
    if (!selectedProfileId) return

    if (confirm('Are you sure you want to delete this profile?')) {
      try {
        await window.electronAPI.profiles.delete(selectedProfileId)
        await loadProfiles()
        setSelectedProfileId('')
        resetForm()
      } catch (err) {
        setError('Failed to delete profile')
      }
    }
  }

  const validateForm = (): string | null => {
    if (saveProfile && !profileName.trim()) {
      return 'Profile name is required when saving'
    }

    if (!url.trim()) {
      return 'URL is required'
    }

    try {
      new URL(url)
    } catch {
      return 'Please enter a valid URL (e.g., http://localhost:8000)'
    }

    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsConnecting(true)

    try {
      const profile: ConnectionProfile = {
        id: selectedProfileId || crypto.randomUUID(),
        name: profileName || `Connection-${Date.now()}`,
        url: url.trim(),
        createdAt: Date.now(),
      }

      // Add optional fields if provided
      if (tenant.trim()) profile.tenant = tenant.trim()
      if (database.trim()) profile.database = database.trim()
      if (apiKey.trim()) profile.apiKey = apiKey.trim()

      // Test connection first before saving or proceeding
      try {
        await window.electronAPI.chromadb.connect(profile)
      } catch (connectionError) {
        // Connection failed - show detailed error message
        const errorMessage = connectionError instanceof Error
          ? connectionError.message
          : 'Failed to connect to ChromaDB'

        throw new Error(`Connection failed: ${errorMessage}`)
      }

      // Connection successful - save profile if requested
      if (saveProfile || selectedProfileId) {
        await window.electronAPI.profiles.save(profile)
      }

      // Proceed to main app
      onConnect(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect to ChromaDB
        </h2>
        <p className="text-gray-600 mb-6">
          Choose a saved profile or create a new connection
        </p>

        {/* Saved Profiles Dropdown */}
        <div className="mb-6 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saved Profiles
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Create new connection...</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          {selectedProfileId && (
            <button
              type="button"
              onClick={handleDeleteProfile}
              className="mt-7 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
              title="Delete profile"
            >
              Delete
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Profile Name */}
          <div className="mb-4">
            <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-2">
              Profile Name
            </label>
            <input
              type="text"
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="My ChromaDB Connection"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* URL Field */}
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Connection URL *
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Examples: http://localhost:8000, https://api.trychroma.com
            </p>
          </div>

          {/* Optional Remote/Cloud Fields */}
          <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Optional: For Remote/Cloud Connections
            </h3>

            <div className="mb-3">
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-700 mb-2">
                Tenant
              </label>
              <input
                type="text"
                id="tenant"
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                placeholder="your-tenant-id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-2">
                Database
              </label>
              <input
                type="text"
                id="database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="your-database-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-0">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="your-api-key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Save Profile Checkbox */}
          {!selectedProfileId && (
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={saveProfile}
                  onChange={(e) => setSaveProfile(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Save this profile
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Testing connection...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  )
}

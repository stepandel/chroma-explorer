import { useState, FormEvent, useEffect } from 'react'
import { ConnectionProfile } from '../../../electron/types'
import { Trash2 } from 'lucide-react'

interface ConnectionModalProps {
  isOpen: boolean
  onConnect: (profile: ConnectionProfile) => void
}

const inputClassName = "w-full h-7 text-[13px] px-2 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"

export default function ConnectionModal({ isOpen, onConnect }: ConnectionModalProps) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [profileName, setProfileName] = useState('')
  const [url, setUrl] = useState('http://localhost:8000')
  const [tenant, setTenant] = useState('')
  const [database, setDatabase] = useState('')
  const [apiKey, setApiKey] = useState('')
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

    if (!profileId || profileId === '__new__') {
      // Clear form
      resetForm()
      setSelectedProfileId('')
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
    if (!profileName.trim()) {
      return 'Profile name is required'
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
        await window.electronAPI.chromadb.connect(profile.id, profile)
      } catch (connectionError) {
        // Connection failed - show detailed error message
        const errorMessage = connectionError instanceof Error
          ? connectionError.message
          : 'Failed to connect to ChromaDB'

        throw new Error(`Connection failed: ${errorMessage}`)
      }

      // Connection successful - save profile
      await window.electronAPI.profiles.save(profile)

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
    <div
      className="fixed inset-0 flex"
      style={{
        background: 'oklch(0.96 0 0 / 85%)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      }}
    >
      {/* Left side - Connection Form */}
      <div className="flex-1 flex flex-col">
        {/* Window chrome area */}
        <div
          className="h-11 flex items-center justify-center"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-[13px] font-medium text-foreground/60">
            {selectedProfileId ? 'Edit Connection' : 'New Connection'}
          </span>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-start justify-center pt-8 px-8">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
            {/* Connection Settings */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label htmlFor="profileName" className="text-[13px] text-foreground/70 w-20 text-right">Name</label>
                  <input
                    type="text"
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="My Connection"
                    className={inputClassName}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="url" className="text-[13px] text-foreground/70 w-20 text-right">URL</label>
                  <input
                    type="text"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    required
                    className={inputClassName}
                  />
                </div>
            </div>

            {/* Advanced Settings Group */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Advanced</h3>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label htmlFor="tenant" className="text-[13px] text-foreground/70 w-20 text-right">Tenant</label>
                  <input
                    type="text"
                    id="tenant"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    placeholder="Optional"
                    className={inputClassName}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="database" className="text-[13px] text-foreground/70 w-20 text-right">Database</label>
                  <input
                    type="text"
                    id="database"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="Optional"
                    className={inputClassName}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="apiKey" className="text-[13px] text-foreground/70 w-20 text-right">API Key</label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Optional"
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="ml-[92px] text-[12px] text-destructive">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 ml-[92px]">
              <button
                type="submit"
                disabled={isConnecting}
                className="h-7 px-4 text-[13px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
              {selectedProfileId && (
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete profile"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right sidebar - Saved Connections */}
      <div
        className="w-52 flex flex-col"
        style={{
          background: 'oklch(0 0 0 / 3%)',
        }}
      >
        {/* Header with drag region */}
        <div
          className="h-11 flex items-center px-4"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">Saved</span>
        </div>

        {/* Connection list */}
        <div className="flex-1 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-muted-foreground/50 text-center">
              No saved connections
            </div>
          ) : (
            <div className="py-1">
              {profiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile.id)}
                    className={`w-full px-4 py-1.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10'
                        : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`text-[13px] truncate ${
                      isSelected ? 'text-foreground font-medium' : 'text-foreground/70'
                    }`}>
                      {profile.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground/50 truncate">
                      {profile.url}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* New connection button */}
        <div className="p-3">
          <button
            onClick={() => handleProfileSelect('')}
            className={`w-full h-7 text-[12px] rounded-md transition-colors ${
              !selectedProfileId
                ? 'bg-primary/10 text-foreground'
                : 'bg-black/[0.03] dark:bg-white/[0.03] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06]'
            }`}
          >
            + New Connection
          </button>
        </div>
      </div>
    </div>
  )
}

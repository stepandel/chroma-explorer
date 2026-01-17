import { useState, FormEvent, useEffect, useCallback } from 'react'
import { ConnectionProfile, DatabaseBackend } from '../../../electron/types'

interface ConnectionModalProps {
  isOpen: boolean
  onConnect: (profile: ConnectionProfile) => void
}

const inputClassName = "w-full h-7 text-[13px] px-2.5 rounded bg-black/[0.06] dark:bg-white/[0.08] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:bg-black/[0.08] dark:focus:bg-white/[0.12] transition-colors border-0"

export default function ConnectionModal({ isOpen, onConnect }: ConnectionModalProps) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [dbType, setDbType] = useState<DatabaseBackend>('chroma')
  const [profileName, setProfileName] = useState('')
  // Chroma fields
  const [url, setUrl] = useState('http://localhost:8000')
  const [tenant, setTenant] = useState('')
  const [database, setDatabase] = useState('')
  const [apiKey, setApiKey] = useState('')
  // Pinecone fields
  const [pineconeApiKey, setPineconeApiKey] = useState('')
  const [pineconeIndexName, setPineconeIndexName] = useState('')
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Load saved profiles on mount
  useEffect(() => {
    if (isOpen) {
      loadProfiles()
    }
  }, [isOpen])

  const handleContextMenu = useCallback((e: React.MouseEvent, profileId: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.electronAPI.contextMenu.showProfileMenu(profileId)
  }, [])

  // Handle context menu actions
  useEffect(() => {
    const unsubscribe = window.electronAPI.contextMenu.onProfileAction((data) => {
      if (data.action === 'connect') {
        handleQuickConnect(data.profileId)
      } else if (data.action === 'edit') {
        handleProfileSelect(data.profileId)
      } else if (data.action === 'delete') {
        handleDeleteProfile(data.profileId)
      }
    })
    return unsubscribe
  }, [profiles]) // Re-subscribe when profiles change so handlers have latest data

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
      setDbType(profile.type || 'chroma')
      setProfileName(profile.name)
      setUrl(profile.url)
      setTenant(profile.tenant || '')
      setDatabase(profile.database || '')
      setApiKey(profile.apiKey || '')
      setPineconeApiKey(profile.pineconeApiKey || '')
      setPineconeIndexName(profile.pineconeIndexName || '')
    }
  }

  const resetForm = () => {
    setDbType('chroma')
    setProfileName('')
    setUrl('http://localhost:8000')
    setTenant('')
    setDatabase('')
    setApiKey('')
    setPineconeApiKey('')
    setPineconeIndexName('')
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (!profileId) return

    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return

    if (confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      try {
        await window.electronAPI.profiles.delete(profileId)
        await loadProfiles()
        if (selectedProfileId === profileId) {
          setSelectedProfileId('')
          resetForm()
        }
      } catch (err) {
        setError('Failed to delete profile')
      }
    }
  }

  const handleQuickConnect = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return

    setError('')
    setIsConnecting(true)

    try {
      await window.electronAPI.chromadb.connect(profile.id, profile)
      onConnect(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }

  const validateForm = (): string | null => {
    if (!profileName.trim()) {
      return 'Profile name is required'
    }

    if (dbType === 'chroma') {
      if (!url.trim()) {
        return 'URL is required'
      }

      try {
        new URL(url)
      } catch {
        return 'Please enter a valid URL (e.g., http://localhost:8000)'
      }
    } else if (dbType === 'pinecone') {
      if (!pineconeApiKey.trim()) {
        return 'Pinecone API Key is required'
      }
      if (!pineconeIndexName.trim()) {
        return 'Pinecone Index Name is required'
      }
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
        type: dbType,
        url: dbType === 'chroma' ? url.trim() : '', // URL only needed for Chroma
        createdAt: Date.now(),
      }

      // Add Chroma-specific fields if provided
      if (dbType === 'chroma') {
        if (tenant.trim()) profile.tenant = tenant.trim()
        if (database.trim()) profile.database = database.trim()
        if (apiKey.trim()) profile.apiKey = apiKey.trim()
      }

      // Add Pinecone-specific fields
      if (dbType === 'pinecone') {
        profile.pineconeApiKey = pineconeApiKey.trim()
        profile.pineconeIndexName = pineconeIndexName.trim()
      }

      // Test connection first before saving or proceeding
      try {
        await window.electronAPI.chromadb.connect(profile.id, profile)
      } catch (connectionError) {
        // Connection failed - show detailed error message
        const errorMessage = connectionError instanceof Error
          ? connectionError.message
          : `Failed to connect to ${dbType === 'pinecone' ? 'Pinecone' : 'ChromaDB'}`

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
        background: 'oklch(0.96 0 0 / 75%)',
      }}
    >
      {/* Left side - Form area */}
      <div className="flex-1 flex flex-col">
        {/* Window drag region - title bar */}
        <div
          className="h-12 flex items-center justify-center flex-shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-[13px] font-medium text-foreground/50">
            {selectedProfileId ? 'Edit Connection' : 'New Connection'}
          </span>
        </div>

        {/* Form content */}
        <div className="flex-1 flex flex-col px-10 pb-5">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col max-w-sm mx-auto w-full">
            {/* Database type tabs */}
            <div className="flex gap-1 mb-4 p-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setDbType('chroma')}
                className={`flex-1 h-6 text-[11px] font-medium rounded transition-colors ${
                  dbType === 'chroma'
                    ? 'bg-white dark:bg-white/[0.12] text-foreground shadow-sm'
                    : 'text-foreground/50 hover:text-foreground/70'
                }`}
              >
                Chroma
              </button>
              <button
                type="button"
                onClick={() => setDbType('pinecone')}
                className={`flex-1 h-6 text-[11px] font-medium rounded transition-colors ${
                  dbType === 'pinecone'
                    ? 'bg-white dark:bg-white/[0.12] text-foreground shadow-sm'
                    : 'text-foreground/50 hover:text-foreground/70'
                }`}
              >
                Pinecone
              </button>
            </div>

            {/* Form fields */}
            <div className="flex-1 space-y-4">
              {/* Common fields */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <label htmlFor="profileName" className="text-[12px] text-foreground/50 w-16 text-right">Name</label>
                  <input
                    type="text"
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="My Connection"
                    className={inputClassName}
                  />
                </div>

                {/* Chroma-specific: URL field */}
                {dbType === 'chroma' && (
                  <div className="flex items-center gap-3">
                    <label htmlFor="url" className="text-[12px] text-foreground/50 w-16 text-right">URL</label>
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
                )}

                {/* Pinecone-specific fields */}
                {dbType === 'pinecone' && (
                  <>
                    <div className="flex items-center gap-3">
                      <label htmlFor="pineconeApiKey" className="text-[12px] text-foreground/50 w-16 text-right">API Key</label>
                      <input
                        type="password"
                        id="pineconeApiKey"
                        value={pineconeApiKey}
                        onChange={(e) => setPineconeApiKey(e.target.value)}
                        placeholder="pcsk_..."
                        required
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label htmlFor="pineconeIndexName" className="text-[12px] text-foreground/50 w-16 text-right">Index</label>
                      <input
                        type="text"
                        id="pineconeIndexName"
                        value={pineconeIndexName}
                        onChange={(e) => setPineconeIndexName(e.target.value)}
                        placeholder="my-index"
                        required
                        className={inputClassName}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Chroma Cloud fields */}
              {dbType === 'chroma' && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-foreground/30 w-16 text-right uppercase tracking-wider">Cloud</span>
                    <div className="flex-1 h-px bg-foreground/10" />
                  </div>

                  <div className="flex items-center gap-3">
                    <label htmlFor="tenant" className="text-[12px] text-foreground/50 w-16 text-right">Tenant</label>
                    <input
                      type="text"
                      id="tenant"
                      value={tenant}
                      onChange={(e) => setTenant(e.target.value)}
                      placeholder="default_tenant"
                      className={inputClassName}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label htmlFor="database" className="text-[12px] text-foreground/50 w-16 text-right">Database</label>
                    <input
                      type="text"
                      id="database"
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      placeholder="default_database"
                      className={inputClassName}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label htmlFor="apiKey" className="text-[12px] text-foreground/50 w-16 text-right">API Key</label>
                    <input
                      type="password"
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="••••••••"
                      className={inputClassName}
                    />
                  </div>
                </div>
              )}

              {/* Pinecone info text */}
              {dbType === 'pinecone' && (
                <div className="pt-2">
                  <p className="text-[11px] text-foreground/40 leading-relaxed">
                    Get your API key from the Pinecone console. Embeddings will be generated client-side using your configured embedding provider.
                  </p>
                </div>
              )}
            </div>

            {/* Error + Action anchored to bottom */}
            <div className="pt-4 flex items-center justify-end gap-3">
              {error && (
                <div className="flex-1 text-[11px] text-destructive truncate">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isConnecting}
                className="h-7 px-5 text-[12px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right sidebar - Saved Connections (full height) */}
      <div
        className="w-44 flex flex-col border-l border-black/[0.08]"
        style={{ background: 'oklch(0 0 0 / 8%)' }}
      >
        {/* Sidebar header with drag region */}
        <div
          className="h-12 flex items-center px-3"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Saved</span>
        </div>

        {/* Connection list */}
        <div className="flex-1 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="px-3 py-4 text-[11px] text-foreground/30 text-center">
              No saved connections
            </div>
          ) : (
            <div>
              {profiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile.id)}
                    onContextMenu={(e) => handleContextMenu(e, profile.id)}
                    className={`w-full px-3 py-1.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-white/[0.08]'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] px-1 py-0.5 rounded uppercase tracking-wider ${
                        profile.type === 'pinecone'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {profile.type === 'pinecone' ? 'PC' : 'CH'}
                      </span>
                      <span className={`text-[12px] truncate flex-1 ${
                        isSelected ? 'text-foreground' : 'text-foreground/60'
                      }`}>
                        {profile.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-foreground/30 truncate pl-5">
                      {profile.type === 'pinecone' ? 'Pinecone' : profile.url.replace(/^https?:\/\//, '')}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* New connection button */}
        <div className="p-2">
          <button
            onClick={() => handleProfileSelect('')}
            className={`w-full h-6 text-[11px] rounded transition-colors ${
              !selectedProfileId
                ? 'bg-white/[0.08] text-foreground/70'
                : 'text-foreground/40 hover:bg-white/[0.04] hover:text-foreground/60'
            }`}
          >
            + New
          </button>
        </div>
      </div>
    </div>
  )
}

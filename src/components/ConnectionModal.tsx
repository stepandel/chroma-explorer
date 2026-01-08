import { useState, FormEvent, useEffect } from 'react'
import { ConnectionProfile } from '../../electron/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

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
        await window.electronAPI.chromadb.connect(profile.id, profile)
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
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-xl shadow-2xl border border-border w-full h-full flex overflow-hidden">
        {/* Left side - Connection Form */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground text-center">
              {selectedProfileId ? 'Edit Connection' : 'New Connection'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Profile Name */}
              <div>
                <Label htmlFor="profileName" className="text-xs">Name</Label>
                <Input
                  type="text"
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="My Connection"
                  className="h-8 text-xs mt-1"
                />
              </div>

              {/* URL */}
              <div>
                <Label htmlFor="url" className="text-xs">URL *</Label>
                <Input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                  required
                  className="h-8 text-xs mt-1"
                />
              </div>

              {/* Optional fields in grid */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="tenant" className="text-xs">Tenant</Label>
                  <Input
                    type="text"
                    id="tenant"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    placeholder="Optional"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="database" className="text-xs">Database</Label>
                  <Input
                    type="text"
                    id="database"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="Optional"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="apiKey" className="text-xs">API Key</Label>
                  <Input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Optional"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Save checkbox */}
              {!selectedProfileId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="saveProfile"
                    checked={saveProfile}
                    onCheckedChange={(checked) => setSaveProfile(checked as boolean)}
                  />
                  <Label htmlFor="saveProfile" className="text-xs cursor-pointer">
                    Save this connection
                  </Label>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 rounded">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isConnecting}
                  className="flex-1 h-8 text-xs"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
                {selectedProfileId && (
                  <Button
                    type="button"
                    onClick={handleDeleteProfile}
                    variant="destructive"
                    className="h-8 text-xs"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right sidebar - Saved Connections */}
        <div className="w-64 bg-sidebar/70 backdrop-blur-xl border-l border-sidebar-border flex flex-col">
          <div className="p-4 border-b border-sidebar-border">
            <h3 className="text-sm font-semibold text-foreground">Saved Connections</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">
                No saved connections
              </div>
            ) : (
              <div className="py-1">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile.id)}
                    className={`w-full px-4 py-2 text-left transition-colors ${
                      selectedProfileId === profile.id
                        ? 'bg-sidebar-accent border-r-2 border-sidebar-primary'
                        : 'hover:bg-sidebar-accent/50 border-r-2 border-transparent'
                    }`}
                  >
                    <div className={`text-sm font-medium truncate ${
                      selectedProfileId === profile.id ? 'text-sidebar-primary' : 'text-sidebar-foreground'
                    }`}>
                      {profile.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {profile.url}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-sidebar-border">
            <Button
              onClick={() => {
                setSelectedProfileId('')
                resetForm()
              }}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              + New Connection
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

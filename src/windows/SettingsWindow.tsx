import { useState, useEffect } from 'react'
import { API_KEY_PROVIDERS } from '../constants/api-key-providers'
import { ExternalLink, Check, Eye, EyeOff, KeyRound, Keyboard } from 'lucide-react'

const inputClassName = "flex-1 h-7 text-[12px] px-2.5 rounded bg-black/[0.06] dark:bg-white/[0.08] text-foreground placeholder:text-foreground/30 focus:outline-none focus:bg-black/[0.08] dark:focus:bg-white/[0.12] transition-colors border-0 font-mono"

// Keyboard shortcuts organized by category
const KEYBOARD_SHORTCUTS = [
  {
    category: 'General',
    shortcuts: [
      { keys: '⌘N', action: 'New Connection' },
      { keys: '⌘,', action: 'Settings' },
      { keys: '⌘R', action: 'Refresh Data' },
      { keys: '⌘W', action: 'Close Window' },
    ],
  },
  {
    category: 'Collections',
    shortcuts: [
      { keys: '⌘⇧N', action: 'New Collection' },
      { keys: '⌘C', action: 'Copy Collection' },
      { keys: '⌘V', action: 'Paste Collection' },
      { keys: '⌘⌫', action: 'Delete Collection' },
    ],
  },
  {
    category: 'Documents',
    shortcuts: [
      { keys: '⌘D', action: 'New Document' },
      { keys: '⌘C', action: 'Copy Documents' },
      { keys: '⌘V', action: 'Paste Documents' },
      { keys: '⌘⌫', action: 'Delete Selected' },
      { keys: '⌘⇧A', action: 'Select All Documents' },
    ],
  },
  {
    category: 'View',
    shortcuts: [
      { keys: '⌘1', action: 'Toggle Collections Panel' },
      { keys: '⌘2', action: 'Toggle Details Panel' },
      { keys: '⌘F', action: 'Focus Search' },
      { keys: '⌘⇧F', action: 'Clear Filters' },
    ],
  },
  {
    category: 'Editing',
    shortcuts: [
      { keys: '⌘S', action: 'Save / Confirm' },
      { keys: '⌘↵', action: 'Save / Confirm' },
      { keys: 'Esc', action: 'Cancel' },
      { keys: '⌘Z', action: 'Undo / Cancel' },
    ],
  },
]

type TabId = 'api-keys' | 'shortcuts'

const TABS: { id: TabId; label: string; icon: typeof KeyRound }[] = [
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
]

// Get initial tab from URL params
function getInitialTab(): TabId {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'shortcuts' || tab === 'api-keys') {
    return tab
  }
  return 'api-keys'
}

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  // Make body transparent for vibrancy effect
  useEffect(() => {
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    return () => {
      document.body.style.background = ''
      document.documentElement.style.background = ''
    }
  }, [])

  // Listen for tab switch messages from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.settings.onSwitchTab((tab) => {
      if (tab === 'shortcuts' || tab === 'api-keys') {
        setActiveTab(tab)
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const keys = await window.electronAPI.settings.getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI.settings.setApiKeys(apiKeys)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save API keys:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyChange = (envVar: string, value: string) => {
    setApiKeys(prev => {
      const updated = { ...prev }
      if (value) {
        updated[envVar] = value
      } else {
        delete updated[envVar]
      }
      return updated
    })
  }

  const toggleVisibility = (envVar: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev)
      if (next.has(envVar)) {
        next.delete(envVar)
      } else {
        next.add(envVar)
      }
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{ background: 'oklch(0.96 0 0 / 75%)' }}
    >
      {/* Title bar with tabs - macOS style */}
      <div
        className="shrink-0 border-b border-black/[0.06]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Title */}
        <div className="h-10 flex items-center justify-center">
          <h1 className="text-[13px] font-medium text-foreground/50">Settings</h1>
        </div>

        {/* Tab bar - macOS toolbar style */}
        <div
          className="flex items-center justify-center gap-1 pb-3 px-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center justify-center px-4 py-1.5 rounded-md transition-all min-w-[72px]
                  ${isActive
                    ? 'bg-black/[0.08] dark:bg-white/[0.12]'
                    : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }
                `}
              >
                <Icon
                  className={`h-5 w-5 mb-0.5 transition-colors ${
                    isActive ? 'text-primary' : 'text-foreground/40'
                  }`}
                  strokeWidth={1.5}
                />
                <span
                  className={`text-[10px] transition-colors ${
                    isActive ? 'text-foreground font-medium' : 'text-foreground/50'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'api-keys' && (
          <>
            {/* Provider rows - flat grouped list */}
            <div className="rounded-lg overflow-hidden" style={{ background: 'oklch(0 0 0 / 4%)' }}>
              {API_KEY_PROVIDERS.map((provider, index) => (
                <div key={provider.id}>
                  {index > 0 && <div className="h-px bg-black/[0.06] mx-3" />}
                  <div className="px-3 py-2.5">
                    {/* Provider header row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-foreground">{provider.name}</span>
                      {provider.docsUrl && (
                        <button
                          type="button"
                          onClick={() => window.electronAPI.shell.openExternal(provider.docsUrl!)}
                          className="text-[11px] text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          Get API key
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Key input rows */}
                    {provider.envVars.map(envVar => (
                      <div key={envVar} className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-foreground/40 w-28 truncate font-mono">
                          {envVar}
                        </span>
                        <div className="relative flex-1">
                          <input
                            type={visibleKeys.has(envVar) ? 'text' : 'password'}
                            value={apiKeys[envVar] || ''}
                            onChange={(e) => handleKeyChange(envVar, e.target.value)}
                            placeholder="sk-..."
                            className={inputClassName}
                            style={{ paddingRight: '2rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => toggleVisibility(envVar)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                          >
                            {visibleKeys.has(envVar) ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Help text */}
            <p className="text-[11px] text-foreground/30 mt-3 px-1">
              API keys are stored securely and encrypted at rest.
            </p>
          </>
        )}

        {activeTab === 'shortcuts' && (
          <>
            <div className="rounded-lg overflow-hidden" style={{ background: 'oklch(0 0 0 / 4%)' }}>
              {KEYBOARD_SHORTCUTS.map((group, groupIndex) => (
                <div key={group.category}>
                  {groupIndex > 0 && <div className="h-px bg-black/[0.06] mx-3" />}
                  <div className="px-3 py-2.5">
                    {/* Category header */}
                    <div className="mb-2">
                      <span className="text-[12px] font-medium text-foreground">{group.category}</span>
                    </div>

                    {/* Shortcut rows */}
                    <div className="space-y-1">
                      {group.shortcuts.map((shortcut, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground/60">{shortcut.action}</span>
                          <kbd className="text-[11px] font-mono text-foreground/70 bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 rounded min-w-[2rem] text-center">
                            {shortcut.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-foreground/30 mt-3 px-1">
              Some shortcuts are context-sensitive and apply to the focused panel.
            </p>
          </>
        )}
      </div>

      {/* Footer - only show Save button for API Keys tab */}
      {activeTab === 'api-keys' && (
        <div className="px-6 pt-4 pb-5 flex justify-end shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-5 text-[12px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              'Saving...'
            ) : saved ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

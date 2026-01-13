import { useMemo } from 'react'

export type WindowType = 'setup' | 'connection' | 'settings' | 'unknown'

export interface WindowInfo {
  windowType: WindowType
  windowId: string | null
  profileId: string | null
}

/**
 * Parse window information from URL query parameters
 */
export function useWindowInfo(): WindowInfo {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const type = params.get('type')
    const windowId = params.get('windowId')
    const profileId = params.get('profileId')

    if (type === 'setup') {
      return {
        windowType: 'setup',
        windowId: null,
        profileId: null,
      }
    }

    if (type === 'settings') {
      return {
        windowType: 'settings',
        windowId: null,
        profileId: null,
      }
    }

    if (type === 'connection' && windowId && profileId) {
      return {
        windowType: 'connection',
        windowId,
        profileId,
      }
    }

    // Fallback to setup for unknown
    console.warn('[useWindowInfo] Unknown window type or missing params, defaulting to setup')
    return {
      windowType: 'unknown',
      windowId: null,
      profileId: null,
    }
  }, [])
}

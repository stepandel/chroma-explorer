import { useEffect, useCallback, useRef } from 'react'
import { KeyboardShortcut, matchesShortcut } from '../constants/keyboard-shortcuts'

interface UseKeyboardShortcutOptions {
  /**
   * Whether the shortcut is currently enabled
   * @default true
   */
  enabled?: boolean

  /**
   * Whether to prevent default browser behavior
   * @default true
   */
  preventDefault?: boolean

  /**
   * Whether to stop event propagation
   * @default false
   */
  stopPropagation?: boolean

  /**
   * Whether to skip when user is typing in an input/textarea
   * @default true
   */
  skipInputs?: boolean

  /**
   * Whether to skip when text is selected (useful for copy shortcuts)
   * @default false
   */
  skipWhenTextSelected?: boolean
}

/**
 * Hook to register a keyboard shortcut handler.
 *
 * @example
 * // Using a shortcut from SHORTCUTS constant
 * useKeyboardShortcut(SHORTCUTS.NEW_DOCUMENT, () => {
 *   handleNewDocument()
 * })
 *
 * @example
 * // With conditions
 * useKeyboardShortcut(SHORTCUTS.SAVE, handleSave, {
 *   enabled: isDirty,
 *   skipInputs: false, // Allow save while typing
 * })
 */
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  callback: (e: KeyboardEvent) => void,
  options: UseKeyboardShortcutOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    skipInputs = true,
    skipWhenTextSelected = false,
  } = options

  // Keep callback ref stable to avoid re-registering on every render
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea/contenteditable
      if (skipInputs) {
        const target = e.target as HTMLElement
        const isInputting =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        if (isInputting) return
      }

      // Skip if text is selected
      if (skipWhenTextSelected) {
        const selection = window.getSelection()?.toString() || ''
        if (selection.length > 0) return
      }

      // Check if this event matches our shortcut
      if (matchesShortcut(e, shortcut)) {
        if (preventDefault) {
          e.preventDefault()
        }
        if (stopPropagation) {
          e.stopPropagation()
        }
        callbackRef.current(e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcut, enabled, preventDefault, stopPropagation, skipInputs, skipWhenTextSelected])
}

/**
 * Hook to register multiple keyboard shortcuts at once.
 *
 * @example
 * useKeyboardShortcuts([
 *   { shortcut: SHORTCUTS.SAVE, handler: handleSave },
 *   { shortcut: SHORTCUTS.CANCEL, handler: handleCancel },
 * ], { enabled: isEditing })
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{
    shortcut: KeyboardShortcut
    handler: (e: KeyboardEvent) => void
    options?: Omit<UseKeyboardShortcutOptions, 'enabled'>
  }>,
  globalOptions: { enabled?: boolean } = {}
): void {
  const { enabled = true } = globalOptions

  // Keep handlers ref stable
  const handlersRef = useRef(shortcuts)
  handlersRef.current = shortcuts

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      for (const { shortcut, handler: cb, options = {} } of handlersRef.current) {
        const {
          preventDefault = true,
          stopPropagation = false,
          skipInputs = true,
          skipWhenTextSelected = false,
        } = options

        // Skip if typing in input/textarea/contenteditable
        if (skipInputs) {
          const target = e.target as HTMLElement
          const isInputting =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          if (isInputting) continue
        }

        // Skip if text is selected
        if (skipWhenTextSelected) {
          const selection = window.getSelection()?.toString() || ''
          if (selection.length > 0) continue
        }

        // Check if this event matches this shortcut
        if (matchesShortcut(e, shortcut)) {
          if (preventDefault) {
            e.preventDefault()
          }
          if (stopPropagation) {
            e.stopPropagation()
          }
          cb(e)
          return // Only handle first matching shortcut
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}

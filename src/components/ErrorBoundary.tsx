import React from 'react'
import { captureRendererError } from '../error-monitoring'

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureRendererError(error, {
      componentStack: info.componentStack || 'missing',
    })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-sm font-medium text-foreground">Something went wrong</h1>
            <p className="mt-2 text-xs text-foreground/60">
              Restart Chroma Explorer and try the action again.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort render crash guard. Without it a thrown error in any portal
 * page unmounts the whole React tree (white screen); with it the user gets
 * a branded fallback card and a one-click page reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-[20px] border border-danger/20 bg-white p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertCircle size={26} aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-xl font-bold tracking-tight text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-6">
              <RefreshCw size={16} aria-hidden="true" />
              Reload Page
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

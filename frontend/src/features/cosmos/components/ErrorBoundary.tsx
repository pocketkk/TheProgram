/**
 * Error Boundary for Cosmic Visualizer
 *
 * Catches and handles rendering errors gracefully to prevent the entire
 * application from crashing when orbital calculations or rendering fails.
 *
 * @module ErrorBoundary
 */

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Error boundary for cosmic visualizer components
 * Catches and handles rendering errors gracefully
 *
 * Usage:
 * ```tsx
 * <CosmicErrorBoundary>
 *   <CosmicVisualizer />
 * </CosmicErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <CosmicErrorBoundary fallback={<CustomErrorComponent />}>
 *   <CosmicVisualizer />
 * </CosmicErrorBoundary>
 * ```
 *
 * With error callback:
 * ```tsx
 * <CosmicErrorBoundary onError={(error) => logToAnalytics(error)}>
 *   <CosmicVisualizer />
 * </CosmicErrorBoundary>
 * ```
 */
export class CosmicErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('[Cosmic Visualizer Error]', error)
    console.error('[Component Stack]', errorInfo.componentStack)

    // Store error info in state
    this.setState({
      errorInfo,
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    })
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
            color: '#e0e0e0',
            borderRadius: '8px',
            margin: '1rem',
            minHeight: '300px',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              marginBottom: '1rem',
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontSize: '1.5rem',
              marginBottom: '0.5rem',
              color: '#ff6b6b',
            }}
          >
            Cosmic Visualization Error
          </h2>
          <p
            style={{
              marginBottom: '1rem',
              textAlign: 'center',
              maxWidth: '500px',
            }}
          >
            Something went wrong with the cosmic visualizer. This could be due to invalid orbital
            parameters or a rendering issue.
          </p>

          {this.state.error && (
            <details
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                maxWidth: '600px',
                width: '100%',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                }}
              >
                Error Details
              </summary>
              <pre
                style={{
                  fontSize: '0.875rem',
                  overflow: 'auto',
                  maxHeight: '200px',
                  padding: '0.5rem',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo && `\n\n${this.state.errorInfo.componentStack}`}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: '#fff',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Try Again
          </button>

          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#888',
            }}
          >
            If the problem persists, try refreshing the page or checking your orbital data.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Lightweight error boundary wrapper for specific components
 * Provides minimal error handling without UI
 */
export class SilentErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Silent Error Boundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}

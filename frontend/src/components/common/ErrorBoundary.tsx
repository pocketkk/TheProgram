/**
 * Generic Error Boundary for The Program
 *
 * Catches and handles rendering errors gracefully across the application.
 * Use this to wrap major feature sections to prevent cascading failures.
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  featureName?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * App-wide error boundary component
 *
 * @example
 * // Wrap a feature
 * <ErrorBoundary featureName="Birth Chart">
 *   <BirthChartPage />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomError />}>
 *   <SomeFeature />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Error Boundary${this.props.featureName ? ` - ${this.props.featureName}` : ''}]`, error)
    console.error('[Component Stack]', errorInfo.componentStack)

    this.setState({ errorInfo })

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

    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const featureName = this.props.featureName || 'This section'

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-dark/50 rounded-lg m-4 min-h-[300px]">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <h2 className="text-xl font-semibold text-red-400">
              Something went wrong
            </h2>
          </div>

          <p className="text-cosmic-text-secondary mb-6 text-center max-w-md">
            {featureName} encountered an unexpected error. You can try again or
            navigate to a different section.
          </p>

          {this.state.error && (
            <details className="mb-6 p-4 bg-black/30 rounded-lg max-w-xl w-full">
              <summary className="cursor-pointer font-medium text-cosmic-text-secondary hover:text-cosmic-text">
                Error Details
              </summary>
              <pre className="mt-2 text-sm overflow-auto max-h-48 p-3 bg-black/50 rounded text-red-300">
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}

          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent-hover text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-surface-dark hover:bg-surface-light text-cosmic-text rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap a component with an error boundary
 *
 * @example
 * const SafeBirthChart = withErrorBoundary(BirthChartPage, 'Birth Chart')
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary featureName={featureName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

export default ErrorBoundary

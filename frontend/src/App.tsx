/**
 * Main App Component
 *
 * Handles routing and authentication flow for single-user application.
 *
 * Authentication Flow:
 * 1. On mount, check auth status
 * 2. If password not set up → show PasswordSetupPage
 * 3. If password set but not authenticated → show LoginPage
 * 4. If authenticated → show main app with layout
 */
import { useState, useEffect } from 'react'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordSetupPage } from './features/auth/PasswordSetupPage'
import { PasswordSettingsPage } from './features/auth/PasswordSettingsPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ClientsPage } from './features/clients/ClientsPage'
import { CosmicVisualizerPage } from './features/cosmos/CosmicVisualizerPage'
import { BirthChartPage } from './features/birthchart'
import { BackupDashboard } from './features/data-portability'
import { AppLayout } from './components/layout/AppLayout'
import { useAuthStore } from './store/authStore'
import { Spinner } from './components/ui'

function App() {
  const { isAuthenticated, needsPasswordSetup, isLoading, checkAuthStatus } = useAuthStore()
  const [currentPage, setCurrentPage] = useState<string>('dashboard')
  const [authChecked, setAuthChecked] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuthStatus()
      setAuthChecked(true)
    }

    initAuth()
  }, [checkAuthStatus])

  // Show loading spinner while checking auth
  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // First-time setup: no password configured
  if (needsPasswordSetup) {
    return <PasswordSetupPage />
  }

  // Not authenticated: show login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Authenticated: show main app
  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <DashboardPage onNavigate={setCurrentPage} />}
      {currentPage === 'clients' && <ClientsPage />}
      {currentPage === 'charts' && <CosmicVisualizerPage />}
      {currentPage === 'birthchart' && <BirthChartPage chartId={null} />}
      {currentPage === 'reports' && <PlaceholderPage title="Reports" />}
      {currentPage === 'backups' && <BackupDashboard />}
      {currentPage === 'settings' && <PasswordSettingsPage />}
      {currentPage === 'help' && <PlaceholderPage title="Help" />}
    </AppLayout>
  )
}

/**
 * Placeholder component for pages not yet built
 */
const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <h1 className="text-4xl font-heading font-bold text-gradient-celestial mb-4">
          {title}
        </h1>
        <p className="text-gray-400">This page is coming soon...</p>
      </div>
    </div>
  )
}

export default App

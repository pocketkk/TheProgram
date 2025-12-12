/**
 * Main App Component
 *
 * Handles routing and authentication flow for single-user application.
 *
 * Authentication Flow:
 * 1. On mount, check auth status
 * 2. If password not set up → show PasswordSetupPage
 * 3. If password set but not authenticated → show LoginPage
 * 4. If authenticated but no birth data → show OnboardingPage
 * 5. If authenticated with birth data → show main app with layout
 */
import { useState, useEffect, useCallback } from 'react'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordSetupPage } from './features/auth/PasswordSetupPage'
import { OnboardingPage } from './features/onboarding'
import { SettingsPage } from './features/settings/SettingsPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { CosmicVisualizerPage } from './features/cosmos/CosmicVisualizerPage'
import { BirthChartPage } from './features/birthchart'
import { FloatingCompanion } from './features/companion'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { useAuthStore } from './store/authStore'
import { Spinner } from './components/ui'
import { listBirthData } from './lib/api/birthData'
// Phase 2 features
import { JournalPage } from './features/journal'
import { TimelinePage } from './features/timeline'
import { CanvasPage } from './features/canvas'
// Phase 3 features
import { TransitDashboard } from './features/transits'
import { TarotPage } from './features/tarot'
import { IChingPage } from './features/iching'
import { NumerologyPage } from './features/numerology'
// Phase 4: Human Design
import { HumanDesignPage } from './features/humandesign'
// Vedic Astrology
import { VedicPage } from './features/vedic'
// Themes
import { ThemesPage } from './features/themes'
// Studio (Image Generators)
import { StudioPage } from './features/studio'
// Coloring Book / Art Therapy
import { ColoringBookPage } from './features/coloring-book'
// Guide module system
import { initializeGuideRegistry, initializeGuideStateRegistry, updateGuideGlobalState } from './lib/guide'

function App() {
  const { isAuthenticated, needsPasswordSetup, isLoading, checkAuthStatus } = useAuthStore()
  const [currentPage, setCurrentPage] = useState<string>('dashboard')
  const [authChecked, setAuthChecked] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [checkingBirthData, setCheckingBirthData] = useState(false)

  // Initialize guide module system on mount
  useEffect(() => {
    initializeGuideRegistry()
    initializeGuideStateRegistry()
  }, [])

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuthStatus()
      setAuthChecked(true)
    }

    initAuth()
  }, [checkAuthStatus])

  // Check for birth data after authentication
  useEffect(() => {
    const checkBirthData = async () => {
      if (!isAuthenticated || needsPasswordSetup) {
        setNeedsOnboarding(null)
        return
      }

      setCheckingBirthData(true)
      try {
        const birthDataList = await listBirthData()
        setNeedsOnboarding(birthDataList.length === 0)
      } catch (error) {
        console.error('Failed to check birth data:', error)
        // If we can't check, assume onboarding is needed
        setNeedsOnboarding(true)
      } finally {
        setCheckingBirthData(false)
      }
    }

    checkBirthData()
  }, [isAuthenticated, needsPasswordSetup])

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback(() => {
    setNeedsOnboarding(false)
  }, [])

  // Handle navigation events from AI companion
  const handleCompanionNavigate = useCallback((event: CustomEvent<{ page: string }>) => {
    setCurrentPage(event.detail.page)
  }, [])

  // Broadcast current page to window for companion context
  // This allows the AI companion to know what page the user is on
  useEffect(() => {
    (window as any).__currentPage = currentPage
    // Also update guide state registry
    updateGuideGlobalState({ currentPage })
  }, [currentPage])

  useEffect(() => {
    window.addEventListener('companion-navigate', handleCompanionNavigate as EventListener)
    return () => {
      window.removeEventListener('companion-navigate', handleCompanionNavigate as EventListener)
    }
  }, [handleCompanionNavigate])

  // Show loading spinner while checking auth or birth data
  if (!authChecked || isLoading || (isAuthenticated && !needsPasswordSetup && needsOnboarding === null) || checkingBirthData) {
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

  // Authenticated but no birth data: show onboarding
  if (needsOnboarding) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />
  }

  // Authenticated with birth data: show main app with AI companion
  return (
    <>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === 'dashboard' && (
          <ErrorBoundary featureName="Dashboard">
            <DashboardPage onNavigate={setCurrentPage} />
          </ErrorBoundary>
        )}
        {currentPage === 'charts' && (
          <ErrorBoundary featureName="Cosmic Visualizer">
            <CosmicVisualizerPage />
          </ErrorBoundary>
        )}
        {currentPage === 'birthchart' && (
          <ErrorBoundary featureName="Birth Chart">
            <BirthChartPage chartId={null} />
          </ErrorBoundary>
        )}
        {currentPage === 'journal' && (
          <ErrorBoundary featureName="Journal">
            <JournalPage />
          </ErrorBoundary>
        )}
        {currentPage === 'timeline' && (
          <ErrorBoundary featureName="Timeline">
            <TimelinePage />
          </ErrorBoundary>
        )}
        {currentPage === 'canvas' && (
          <ErrorBoundary featureName="Canvas">
            <CanvasPage />
          </ErrorBoundary>
        )}
        {currentPage === 'transits' && (
          <ErrorBoundary featureName="Transits">
            <TransitDashboard />
          </ErrorBoundary>
        )}
        {currentPage === 'tarot' && (
          <ErrorBoundary featureName="Tarot">
            <TarotPage />
          </ErrorBoundary>
        )}
        {currentPage === 'iching' && (
          <ErrorBoundary featureName="I Ching">
            <IChingPage />
          </ErrorBoundary>
        )}
        {currentPage === 'numerology' && (
          <ErrorBoundary featureName="Numerology">
            <NumerologyPage />
          </ErrorBoundary>
        )}
        {currentPage === 'humandesign' && (
          <ErrorBoundary featureName="Human Design">
            <HumanDesignPage />
          </ErrorBoundary>
        )}
        {currentPage === 'vedic' && (
          <ErrorBoundary featureName="Vedic">
            <VedicPage />
          </ErrorBoundary>
        )}
        {currentPage === 'themes' && (
          <ErrorBoundary featureName="Themes">
            <ThemesPage />
          </ErrorBoundary>
        )}
        {currentPage === 'studio' && (
          <ErrorBoundary featureName="Studio">
            <StudioPage />
          </ErrorBoundary>
        )}
        {currentPage === 'coloringbook' && (
          <ErrorBoundary featureName="Coloring Book">
            <ColoringBookPage />
          </ErrorBoundary>
        )}
        {currentPage === 'settings' && (
          <ErrorBoundary featureName="Settings">
            <SettingsPage />
          </ErrorBoundary>
        )}
        {currentPage === 'help' && <PlaceholderPage title="Help" />}
      </AppLayout>
      <FloatingCompanion />
    </>
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

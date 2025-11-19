import { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

export const AppLayout = ({ children, currentPage, onNavigate }: AppLayoutProps) => {
  return (
    <div className="min-h-screen cosmic-bg relative">
      {/* Starfield background */}
      <div className="starfield" />

      {/* Main layout */}
      <div className="relative z-10">
        <Header />
        <div className="flex">
          <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

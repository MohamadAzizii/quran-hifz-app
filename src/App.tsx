import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './screens/LoginScreen'
import { Dashboard } from './screens/Dashboard'
import { MemorisationSession } from './screens/MemorisationSession'
import { RevisionSession } from './screens/RevisionSession'
import { ReadingSession } from './screens/ReadingSession'
import { MyQuran } from './screens/MyQuran'
import { SettingsScreen } from './screens/SettingsScreen'
import { SurahPicker } from './screens/SurahPicker'
import { BottomNav } from './components/BottomNav'
import { Sidebar } from './components/Sidebar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { queryClient } from './lib/queryClient'
import { flushQueue } from './lib/offline-queue'

function AuthedRoutes() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (user && navigator.onLine) {
      flushQueue().catch(console.error)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }
  if (!user) return <LoginScreen />

  return (
    <BrowserRouter>
      <Sidebar />
      <div className="md:pl-60">
        <AnimatedRoutes />
      </div>
      <PersistentBottomNav />
    </BrowserRouter>
  )
}

const TAB_PATHS = new Set(['/', '/quran', '/settings'])

function PersistentBottomNav() {
  const location = useLocation()
  if (!TAB_PATHS.has(location.pathname)) return null
  return <BottomNav />
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/memorise" element={<MemorisationSession />} />
        <Route path="/pick-surah" element={<SurahPicker />} />
        <Route path="/revise" element={<RevisionSession />} />
        <Route path="/revise/reading" element={<ReadingSession />} />
        <Route path="/quran" element={<MyQuran />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthedRoutes />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

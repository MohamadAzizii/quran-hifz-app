import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './screens/LoginScreen'
import { Dashboard } from './screens/Dashboard'
import { MemorisationSession } from './screens/MemorisationSession'
import { RevisionSession } from './screens/RevisionSession'
import { MyQuran } from './screens/MyQuran'
import { SettingsScreen } from './screens/SettingsScreen'
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
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }
  if (!user) return <LoginScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/memorise" element={<MemorisationSession />} />
        <Route path="/revise" element={<RevisionSession />} />
        <Route path="/quran" element={<MyQuran />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
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

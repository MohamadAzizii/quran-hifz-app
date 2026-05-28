import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    if (mode === 'signin') {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.message)
    } else {
      const { data, error: err } = await signUp(email, password)
      if (err) {
        setError(err.message)
      } else if (!data.session) {
        // Email confirmation is on — account exists but no active session yet.
        setSuccess('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
        setPassword('')
      }
      // If data.session is present (confirmation disabled), onAuthStateChange
      // in useAuth will navigate the user into the app automatically.
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Hifz Companion</h1>
        <p className="text-slate-400 text-sm mb-8">
          Your personal Quran memorisation app
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#151a23] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#151a23] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setSuccess(null)
            }}
            className="text-slate-400 text-sm"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

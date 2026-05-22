import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-4xl">⚠️</div>
          <div className="text-lg font-bold">Something went wrong</div>
          <div className="text-sm text-slate-400 text-center max-w-sm">
            {this.state.error.message}
          </div>
          <button
            onClick={() => {
              this.setState({ error: null })
              location.reload()
            }}
            className="bg-indigo-500 text-white rounded-xl px-5 py-3 font-semibold"
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

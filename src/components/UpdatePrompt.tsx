import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function UpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedsRefresh(true)
      },
    })
    setUpdateSW(() => update)
  }, [])

  if (!needsRefresh) return null
  return (
    <div
      role="alert"
      className="fixed bottom-20 left-4 right-4 z-50 bg-blue-900 text-white rounded-xl p-3 flex items-center gap-3 shadow-lg max-w-lg mx-auto"
    >
      <span className="flex-1 text-sm">A new version is available.</span>
      <button
        onClick={() => updateSW?.()}
        className="bg-blue-500 px-3 py-1.5 rounded-lg text-sm font-bold"
      >
        Reload
      </button>
      <button
        onClick={() => setNeedsRefresh(false)}
        className="text-blue-200 px-2 text-sm"
      >
        Later
      </button>
    </div>
  )
}

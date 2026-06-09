import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { computeTodaysTasks } from '../lib/today-tasks'
import { useUserPagesQuery } from './useUserPages'

function todayString() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function useTodaysTasks() {
  const { data: pages = [], isLoading } = useUserPagesQuery()
  const [today, setToday] = useState(todayString)

  useEffect(() => {
    const tick = () => {
      const t = todayString()
      setToday((prev) => (prev === t ? prev : t))
    }
    const interval = setInterval(tick, 60_000)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const tasks = useMemo(() => computeTodaysTasks(pages, today), [pages, today])
  return { tasks, loading: isLoading, today }
}

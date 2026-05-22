import { useEffect } from 'react'
import { format } from 'date-fns'
import { useUserPagesQuery, useGraduatePage } from './useUserPages'
import { useSettings } from './useSettings'
import { pagesToGraduate } from '../lib/auto-graduate'

export function useAutoGraduate() {
  const { data: pages = [] } = useUserPagesQuery()
  const { settings } = useSettings()
  const graduate = useGraduatePage()

  useEffect(() => {
    if (!settings) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const due = pagesToGraduate(pages, today, settings.recent_cycle_days)
    for (const p of due) {
      graduate.mutate({ page_number: p.page_number, to: 'memorised', strength: p.strength })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length, settings?.recent_cycle_days])
}

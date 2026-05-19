import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { QuranPage } from '../types'

export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: async (): Promise<QuranPage[]> => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('page_number')
      if (error) throw error
      return data ?? []
    },
    staleTime: Infinity,
  })
}

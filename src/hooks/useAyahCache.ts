import { useQuery } from '@tanstack/react-query'
import { getAyahsForPage } from '../lib/ayah-cache-idb'

export function useAyahCache(pageNumber: number | null) {
  const query = useQuery({
    queryKey: ['ayahs', pageNumber],
    enabled: pageNumber != null,
    queryFn: () => getAyahsForPage(pageNumber!),
    staleTime: Infinity,
  })
  return { ayahs: query.data ?? [], loading: query.isLoading }
}

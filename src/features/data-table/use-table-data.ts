import { useQuery } from "@tanstack/react-query"
import { createQueryOptions } from "@/services/query-factory"
import type { EndpointDefinition } from "@/types/config"

export function useTableData(
  endpoint: EndpointDefinition | undefined,
  params: Record<string, string> = {},
) {
  const query = useQuery({
    ...createQueryOptions(endpoint!, params),
    enabled: !!endpoint,
  })

  return {
    data: (query.data as Record<string, unknown>[]) ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

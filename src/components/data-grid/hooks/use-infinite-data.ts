import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import type { QueryKey } from "@tanstack/react-query"
import type { SortState } from "@/components/data-grid/types/sort-types"
import type { FilterState } from "@/components/data-grid/types/filter-types"
import type { GridRow } from "@/components/data-grid/types/grid-types"

export interface InfinitePageResult<TData> {
  rows: TData[]
  nextPage: number | null
  total?: number
}

interface InfiniteDataConfig<TData> {
  queryKey: QueryKey
  queryFn: (params: {
    pageParam: number
    sort: SortState[]
    filters: FilterState[]
  }) => Promise<InfinitePageResult<TData>>
  sortState: SortState[]
  filterState: FilterState[]
  enabled?: boolean
}

export function useInfiniteData<TData extends GridRow>(
  config: InfiniteDataConfig<TData>,
) {
  const query = useInfiniteQuery({
    queryKey: [
      ...config.queryKey,
      { sort: config.sortState, filters: config.filterState },
    ],
    queryFn: ({ pageParam = 0 }) =>
      config.queryFn({
        pageParam: pageParam as number,
        sort: config.sortState,
        filters: config.filterState,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: config.enabled !== false,
  })

  const rows = useMemo(
    () => query.data?.pages.flatMap((page) => page.rows) ?? [],
    [query.data],
  )

  return {
    rows,
    total: query.data?.pages[0]?.total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
  }
}

import React from "react"
import type { SortingState, OnChangeFn } from "@tanstack/react-table"
import type { SortingFeatureConfig } from "@/components/data-grid/types/grid-types"
import type { SortState } from "@/components/data-grid/types/sort-types"

function useDebounce<T extends (...args: never[]) => void>(
  fn: T | undefined,
  ms: number,
): T | undefined {
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const fnRef = React.useRef(fn)
  fnRef.current = fn
  return React.useMemo(
    () =>
      fn
        ? ((...args: Parameters<T>) => {
            clearTimeout(timerRef.current)
            timerRef.current = setTimeout(
              () => fnRef.current?.(...args),
              ms,
            )
          }) as T
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ms],
  )
}

export function useSorting(config: SortingFeatureConfig | undefined) {
  const mode = config?.mode ?? "client"
  const onSortChange = config?.onSortChange

  const [sortingState, setSortingState] = React.useState<SortingState>([])

  const debouncedOnSortChange = useDebounce(onSortChange, 200)

  const handleSortingChange: OnChangeFn<SortingState> = React.useCallback(
    (updater) => {
      setSortingState((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater
        if (mode === "server" && debouncedOnSortChange) {
          const sorts: SortState[] = next.map((s) => ({
            columnId: s.id,
            direction: s.desc ? "desc" : "asc",
          }))
          debouncedOnSortChange(sorts)
        }
        return next
      })
    },
    [mode, debouncedOnSortChange],
  )

  const isSorted = React.useCallback(
    (columnId: string): "asc" | "desc" | false => {
      const found = sortingState.find((s) => s.id === columnId)
      if (!found) return false
      return found.desc ? "desc" : "asc"
    },
    [sortingState],
  )

  const tableOptions = {
    manualSorting: mode === "server",
    onSortingChange: handleSortingChange,
    enableMultiSort: true,
    sortDescFirst: false,
  }

  return { sortingState, isSorted, tableOptions }
}

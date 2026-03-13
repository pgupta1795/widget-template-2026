import React from "react"
import type { Row } from "@tanstack/react-table"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import { mergeChildrenIntoTree } from "@/components/data-grid/utils/grid-utils"

interface LazyExpandConfig {
  onExpand?: (row: GridRow) => Promise<GridRow[]> | void
  setData: React.Dispatch<React.SetStateAction<GridRow[]>>
}

export function useLazyExpand({ onExpand, setData }: LazyExpandConfig) {
  const [loadingRowIds, setLoadingRowIds] = React.useState<Set<string>>(
    new Set(),
  )

  const handleExpand = React.useCallback(
    async (row: Row<GridRow>) => {
      if (!onExpand) return
      const rowData = row.original
      const alreadyHasChildren =
        rowData.children && rowData.children.length > 0
      if (alreadyHasChildren) return

      setLoadingRowIds((prev) => new Set(prev).add(row.id))
      try {
        const children = await onExpand(rowData)
        if (children) {
          setData((prev) =>
            mergeChildrenIntoTree(
              prev,
              rowData.id,
              children,
            ) as GridRow[],
          )
        }
      } finally {
        setLoadingRowIds((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [onExpand, setData],
  )

  return { loadingRowIds, handleExpand }
}

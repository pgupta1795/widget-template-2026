import type { SelectionFeatureConfig } from "@/components/data-grid/types/grid-types"
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import React from "react"

export function useSelection(config: SelectionFeatureConfig | undefined) {
  const mode = config?.mode ?? "multi"

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> =
    React.useCallback((updater) => {
      setRowSelection((prev) =>
        typeof updater === "function" ? updater(prev) : updater
      )
    }, [])

  const clearSelection = React.useCallback(() => setRowSelection({}), [])

  const tableOptions = {
    enableRowSelection: config?.enabled ?? true,
    enableMultiRowSelection: mode === "multi",
    onRowSelectionChange: handleRowSelectionChange,
  }

  return { rowSelection, clearSelection, tableOptions }
}

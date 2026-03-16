import type { ActiveEdit } from "@/components/data-grid/features/editing/use-editing"
import type { ToolbarCommand } from "@/components/data-grid/toolbar/toolbar.types"
import type {
  ColVirtualizerInstance,
  RowVirtualizerInstance,
} from "@/components/data-grid/features/virtualization/use-virtualization"
import type {
  GridDensity,
  GridFeaturesConfig,
  GridMode,
  GridRow,
} from "@/components/data-grid/types/grid-types"
import type { GridSlots } from "@/components/data-grid/types/slot-types"
import type { Row, Table } from "@tanstack/react-table"
import React from "react"

export interface DataGridContextValue {
  table: Table<GridRow>
  isLoading: boolean
  isRefetching: boolean
  isFetchingNextPage: boolean
  density: GridDensity
  setDensity: (d: GridDensity) => void
  globalFilter: string
  setGlobalFilter: (v: string) => void
  tableContainerRef: React.RefObject<HTMLDivElement | null>
  features?: GridFeaturesConfig
  mode?: GridMode
  slots?: GridSlots
  onRefresh?: () => void
  // Toolbar
  toolbarCommands?: ToolbarCommand[]
  toolbarClassName?: string
  /** Fires a DAG action by id. No-op when DataGrid is standalone (no onAction prop). */
  executeApiNode: (actionId: string) => Promise<void>
  /** Server-side search relay. Undefined when DataGrid has no onSearch prop wired. */
  onSearch?: (paramName: string, query: string) => void
  // Tree features
  handleExpand: (row: Row<GridRow>) => Promise<void>
  loadingRowIds: Set<string>
  // Virtualization
  rowVirtualizer: RowVirtualizerInstance
  columnVirtualizer: ColVirtualizerInstance
  // Editing
  activeEdit: ActiveEdit | null
  startEditing: (rowId: string, columnId: string, value: unknown) => void
  cancelEditing: () => void
  commitEditing: (value: unknown) => Promise<void>
  mutatingRowIds: Set<string>
  errorRowIds: Set<string>
  // Pagination
  pagination: { pageIndex: number; pageSize: number }
  setPagination: React.Dispatch<
    React.SetStateAction<{ pageIndex: number; pageSize: number }>
  >
  paginatedTotal: number | undefined
  // Infinite
  hasNextPage: boolean
  fetchNextPage: () => void
}

const DataGridContext = React.createContext<DataGridContextValue | null>(null)

interface DataGridProviderProps {
  value: DataGridContextValue
  children: React.ReactNode
}

export function DataGridProvider({ value, children }: DataGridProviderProps) {
  return (
    <DataGridContext.Provider value={value}>
      {children}
    </DataGridContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataGridContext(): DataGridContextValue {
  const context = React.useContext(DataGridContext)
  if (context === null) {
    throw new Error("useDataGridContext must be used within a DataGridProvider")
  }
  return context
}

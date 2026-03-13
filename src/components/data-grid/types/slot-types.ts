import type { Table } from '@tanstack/react-table'
import type { GridRow } from './grid-types'

export interface ToolbarSlotProps {
  table: Table<GridRow>
}

export interface GridSlots {
  toolbar?: (props: ToolbarSlotProps) => React.ReactNode
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
  selectionActions?: (selectedRows: GridRow[]) => React.ReactNode
  emptyState?: React.ReactNode
  loadingState?: React.ReactNode
}

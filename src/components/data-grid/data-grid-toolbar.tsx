// src/components/data-grid/data-grid-toolbar.tsx
import type { GridColumnDef } from '@/components/data-grid/types/column-types'
import { exportToCsv } from '@/components/data-grid/utils/csv-export'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Check, Download, ListFilter, X } from 'lucide-react'
import { memo } from 'react'
import { ToolbarRenderer } from './toolbar/toolbar-renderer'
import { useDataGridContext } from './data-grid-context'
import type { GridRow } from './types/grid-types'
import { clearAllFilters } from './utils/grid-utils'

// ─── Active Filters Badge ────────────────────────────────────────────────────

const ActiveFiltersBadge = memo(function ActiveFiltersBadge() {
  const { table, globalFilter } = useDataGridContext()
  const columnFilters = table.getState().columnFilters
  const activeFilterCount =
    columnFilters.length + (globalFilter.length > 0 ? 1 : 0)

  if (activeFilterCount === 0) return null

  return (
    <div className="flex animate-in items-center gap-1 border-b border-border/40 bg-muted/20 px-3 py-1 duration-150 fade-in">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <ListFilter className="h-3 w-3 text-primary" />
        <span className="font-medium text-primary">{activeFilterCount}</span>
        <span>filter{activeFilterCount !== 1 ? 's' : ''}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
        onClick={() => clearAllFilters(table)}
      >
        <X className="h-3 w-3" />
        Reset
      </Button>
    </div>
  )
})

// ─── Selection Action Bar ────────────────────────────────────────────────────

const SelectionActionBar = memo(function SelectionActionBar() {
  const { table, slots } = useDataGridContext()
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((r) => r.original) as GridRow[]

  if (selectedRows.length === 0) return null

  const handleExportSelected = () => {
    const columns = table
      .getVisibleLeafColumns()
      .map((col) => col.columnDef) as GridColumnDef[]
    exportToCsv(selectedRows, columns, 'selected-export')
  }

  const clearSelection = () => table.resetRowSelection()

  return (
    <div className="flex h-10 animate-in items-center gap-2 border-b border-primary/20 bg-primary/5 px-3 text-sm duration-200 slide-in-from-top-2">
      <Check className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium text-primary">
        {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
      </span>
      <Separator orientation="vertical" className="mx-1 h-4" />

      {/* Custom slot for selection actions */}
      {slots?.selectionActions?.(selectedRows)}

      {/* Default: export selected */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5"
        onClick={handleExportSelected}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="text-xs">Export selected</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-7 gap-1.5"
        onClick={clearSelection}
      >
        <X className="h-3.5 w-3.5" />
        <span className="text-xs">Clear</span>
      </Button>
    </div>
  )
})

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export const DataGridToolbar = memo(function DataGridToolbar() {
  const { toolbarCommands, toolbarClassName } = useDataGridContext()

  return (
    <div>
      <SelectionActionBar />
      <ActiveFiltersBadge />
      {toolbarCommands !== undefined && (
        <ToolbarRenderer
          commands={toolbarCommands}
          className={toolbarClassName}
        />
      )}
    </div>
  )
})

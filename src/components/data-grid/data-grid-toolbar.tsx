import type { GridColumnDef } from "@/components/data-grid/types/column-types"
import type {
  GridDensity,
  GridRow,
} from "@/components/data-grid/types/grid-types"
import { exportToCsv } from "@/components/data-grid/utils/csv-export"
import {
  clearAllFilters,
  getColumnHeaderText,
} from "@/components/data-grid/utils/grid-utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  AlignJustify,
  Check,
  ChevronsUpDown,
  Columns3,
  Download,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { memo } from "react"
import { useDataGridContext } from "./data-grid-context"

const DENSITIES: GridDensity[] = ["compact", "normal", "comfortable"]

// ─── Search Input ───────────────────────────────────────────────────────────

const SearchInput = memo(function SearchInput() {
  const { globalFilter, setGlobalFilter } = useDataGridContext()

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="h-8 w-56 pl-8 text-sm transition-[width] duration-200 focus:w-72"
      />
      {globalFilter && (
        <button
          onClick={() => setGlobalFilter("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
})

// ─── Active Filters Badge ────────────────────────────────────────────────────

const ActiveFiltersBadge = memo(function ActiveFiltersBadge() {
  const { table, globalFilter } = useDataGridContext()
  const columnFilters = table.getState().columnFilters
  const activeFilterCount =
    columnFilters.length + (globalFilter.length > 0 ? 1 : 0)

  if (activeFilterCount === 0) return null

  return (
    <div className="flex animate-in items-center gap-1 duration-150 fade-in">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <ListFilter className="h-3 w-3 text-primary" />
        <span className="font-medium text-primary">{activeFilterCount}</span>
        <span>filter{activeFilterCount !== 1 ? "s" : ""}</span>
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

// ─── Column Visibility ───────────────────────────────────────────────────────

const ColumnVisibilityToggle = memo(function ColumnVisibilityToggle() {
  const { table } = useDataGridContext()
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((col) => col.columnDef.enableHiding !== false)

  return (
    <Popover>
      <PopoverTrigger
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "h-8 gap-1.5",
        })}
      >
        <Columns3 className="h-3.5 w-3.5" />
        <span className="text-xs">Columns</span>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Toggle columns
        </div>
        {hideableColumns.map((col) => (
          <label
            key={col.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
          >
            <Checkbox
              checked={col.getIsVisible()}
              onCheckedChange={() => col.toggleVisibility()}
            />
            <span className="text-sm">{getColumnHeaderText(col)}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
})

// ─── Density Control ─────────────────────────────────────────────────────────

const DensityControl = memo(function DensityControl() {
  const { density, setDensity } = useDataGridContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "h-8 w-8",
        })}
        title="Density"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Density
          </DropdownMenuLabel>
          {DENSITIES.map((d) => (
            <DropdownMenuItem key={d} onClick={() => setDensity(d)}>
              {density === d && <Check className="mr-2 h-3.5 w-3.5" />}
              {density !== d && <span className="w-5.5" />}
              <span className="capitalize">{d}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

// ─── Expand All (tree mode) ──────────────────────────────────────────────────

const ExpandAllControl = memo(function ExpandAllControl() {
  const { table } = useDataGridContext()
  const isAllExpanded = table.getIsAllRowsExpanded()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5"
      onClick={() => table.toggleAllRowsExpanded()}
    >
      <ChevronsUpDown className="h-3.5 w-3.5" />
      <span className="text-xs">
        {isAllExpanded ? "Collapse" : "Expand all"}
      </span>
    </Button>
  )
})

// ─── Refresh Button ──────────────────────────────────────────────────────────

const RefreshButton = memo(function RefreshButton() {
  const { isRefetching, onRefresh } = useDataGridContext()

  if (!onRefresh) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onRefresh}
      disabled={isRefetching}
      title="Refresh"
    >
      <RefreshCw
        className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")}
      />
    </Button>
  )
})

// ─── Export CSV ──────────────────────────────────────────────────────────────

const ExportButton = memo(function ExportButton() {
  const { table } = useDataGridContext()

  const handleExport = () => {
    const rows = table
      .getFilteredRowModel()
      .rows.map((r) => r.original) as GridRow[]
    const columns = table
      .getVisibleLeafColumns()
      .map((col) => col.columnDef) as GridColumnDef[]
    exportToCsv(rows, columns, "export")
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5"
      onClick={handleExport}
    >
      <Download className="h-3.5 w-3.5" />
      <span className="text-xs">Export</span>
    </Button>
  )
})

// ─── Add Row ──────────────────────────────────────────────────────────────────

const AddRowButton = memo(function AddRowButton() {
  const { features } = useDataGridContext()
  const addRowConfig =
    typeof features?.addRow === "object" ? features.addRow : null
  const onAddRow = addRowConfig?.onAddRow

  if (!features?.addRow) return null

  return (
    <Button size="sm" className="h-8 gap-1.5" onClick={onAddRow}>
      <Plus className="h-3.5 w-3.5" />
      <span className="text-xs">Add row</span>
    </Button>
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
    exportToCsv(selectedRows, columns, "selected-export")
  }

  const clearSelection = () => table.resetRowSelection()

  return (
    <div className="flex h-10 animate-in items-center gap-2 border-b border-primary/20 bg-primary/5 px-3 text-sm duration-200 slide-in-from-top-2">
      <Check className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium text-primary">
        {selectedRows.length} row{selectedRows.length !== 1 ? "s" : ""} selected
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
  const { mode, slots } = useDataGridContext()

  return (
    <div>
      <SelectionActionBar />
      <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md">
        {/* Left slot */}
        {slots?.toolbarLeft}

        <SearchInput />
        <ActiveFiltersBadge />

        {/* Spacer */}
        <div className="flex-1" />

        <ColumnVisibilityToggle />
        <DensityControl />

        {mode === "tree" && <ExpandAllControl />}

        <RefreshButton />
        <ExportButton />
        <AddRowButton />

        {/* Right slot */}
        {slots?.toolbarRight}
      </div>
    </div>
  )
})

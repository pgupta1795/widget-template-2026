// src/components/data-grid/toolbar/toolbar-renderer.tsx
import type { GridColumnDef } from '@/components/data-grid/types/column-types'
import type { AddRowFeatureConfig, GridDensity, GridRow } from '@/components/data-grid/types/grid-types'
import { exportToCsv } from '@/components/data-grid/utils/csv-export'
import { getColumnHeaderText } from '@/components/data-grid/utils/grid-utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  AlignJustify,
  Check,
  ChevronsUpDown,
  Columns3,
  Download,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import type { Row } from '@tanstack/react-table'
import { useDataGridContext } from '../data-grid-context'
import { CommandButton } from './command-button'
import { CommandMenu } from './command-menu'
import { CommandSearch } from './command-search'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

// Phase 3 will add executeApiNode and onSearch to DataGridContextValue.
// Until then, access them safely via this type cast to avoid compile errors.
type FutureContext = {
  executeApiNode?: (id: string) => Promise<void>
  onSearch?: (paramName: string, query: string) => void
}

// ─── Built-in: Column Visibility ─────────────────────────────────────────────

const BuiltInColumnVisibility = memo(function BuiltInColumnVisibility({
  command,
  ctx,
}: {
  command: ToolbarCommand
  ctx: ToolbarContext
}) {
  const hideableColumns = ctx.table
    .getAllLeafColumns()
    .filter((col) => col.columnDef.enableHiding !== false)

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'h-8 gap-1.5',
          command.className,
        )}
      >
        <Columns3 className="h-3.5 w-3.5" />
        {command.label && <span className="text-xs">{command.label}</span>}
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

// ─── Built-in: Density ────────────────────────────────────────────────────────

const DENSITIES: GridDensity[] = ['compact', 'normal', 'comfortable']

const BuiltInDensity = memo(function BuiltInDensity({
  command,
  ctx,
}: {
  command: ToolbarCommand
  ctx: ToolbarContext
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8',
          command.className,
        )}
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
            <DropdownMenuItem key={d} onClick={() => ctx.setDensity(d)}>
              {ctx.density === d ? (
                <Check className="mr-2 h-3.5 w-3.5" />
              ) : (
                <span className="w-5.5" />
              )}
              <span className="capitalize">{d}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

// ─── Built-in: Expand All ─────────────────────────────────────────────────────

const BuiltInExpandAll = memo(function BuiltInExpandAll({
  command,
  ctx,
}: {
  command: ToolbarCommand
  ctx: ToolbarContext
}) {
  const isAllExpanded = ctx.table.getIsAllRowsExpanded()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8 gap-1.5', command.className)}
      disabled={command.disabled}
      onClick={() => ctx.table.toggleAllRowsExpanded()}
    >
      <ChevronsUpDown className="h-3.5 w-3.5" />
      <span className="text-xs">{isAllExpanded ? 'Collapse all' : 'Expand all'}</span>
    </Button>
  )
})

// ─── Built-in: Refresh ────────────────────────────────────────────────────────

const BuiltInRefresh = memo(function BuiltInRefresh({
  command,
  ctx,
}: {
  command: ToolbarCommand
  ctx: ToolbarContext
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', command.className)}
      onClick={() => ctx.refetch?.()}
      disabled={ctx.isRefetching}
      title="Refresh"
    >
      <RefreshCw
        className={cn('h-3.5 w-3.5', ctx.isRefetching && 'animate-spin')}
      />
    </Button>
  )
})

// ─── Built-in: Export ─────────────────────────────────────────────────────────

const BuiltInExport = memo(function BuiltInExport({
  command,
  ctx,
}: {
  command: ToolbarCommand
  ctx: ToolbarContext
}) {
  const [isPending, setIsPending] = useState(false)

  const handleExport = async () => {
    setIsPending(true)
    try {
      const columns = ctx.table
        .getVisibleLeafColumns()
        .map((col) => col.columnDef) as GridColumnDef[]
      exportToCsv(ctx.rows, columns, 'export')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8 gap-1.5', command.className)}
      disabled={command.disabled === true || isPending}
      onClick={handleExport}
    >
      <Download className="h-3.5 w-3.5" />
      {command.label && <span className="text-xs">{command.label}</span>}
    </Button>
  )
})

// ─── Built-in: Add Row ────────────────────────────────────────────────────────

const BuiltInAddRow = memo(function BuiltInAddRow({
  command,
  ctx,
}: {
  command: ToolbarCommand
  ctx: ToolbarContext
}) {
  const addRowConfig =
    typeof ctx.features?.addRow === 'object'
      ? (ctx.features.addRow as AddRowFeatureConfig)
      : null

  if (!addRowConfig) return null

  return (
    <Button
      size="sm"
      className={cn('h-8 gap-1.5', command.className)}
      disabled={command.disabled}
      onClick={() => addRowConfig.onAddRow?.()}
    >
      <Plus className="h-3.5 w-3.5" />
      {command.label && <span className="text-xs">{command.label}</span>}
    </Button>
  )
})

// ─── Dispatch: route each command to its renderer ────────────────────────────

function renderCommand(command: ToolbarCommand, ctx: ToolbarContext) {
  if (command.type === 'spacer') {
    return <div key={command.id} className="flex-1" />
  }
  if (command.type === 'separator') {
    return (
      <Separator
        key={command.id}
        orientation="vertical"
        className="mx-1 h-4"
      />
    )
  }

  // Built-in IDs with dedicated rendering
  if (command.id === 'columnVisibility') {
    return <BuiltInColumnVisibility key={command.id} command={command} ctx={ctx} />
  }
  if (command.id === 'density') {
    return <BuiltInDensity key={command.id} command={command} ctx={ctx} />
  }
  if (command.id === 'expandAll') {
    return <BuiltInExpandAll key={command.id} command={command} ctx={ctx} />
  }
  if (command.id === 'refresh') {
    return <BuiltInRefresh key={command.id} command={command} ctx={ctx} />
  }
  if (command.id === 'export') {
    return <BuiltInExport key={command.id} command={command} ctx={ctx} />
  }
  if (command.id === 'addRow') {
    return <BuiltInAddRow key={command.id} command={command} ctx={ctx} />
  }

  // Generic type-based rendering
  if (command.type === 'search') {
    return <CommandSearch key={command.id} command={command} ctx={ctx} />
  }
  if (command.type === 'menu') {
    return <CommandMenu key={command.id} command={command} ctx={ctx} />
  }
  if (command.type === 'command') {
    return <CommandButton key={command.id} command={command} ctx={ctx} />
  }

  return null
}

// ─── Main: ToolbarRenderer ────────────────────────────────────────────────────

interface ToolbarRendererProps {
  commands: ToolbarCommand[]
  className?: string
}

export const ToolbarRenderer = memo(function ToolbarRenderer({
  commands,
  className,
}: ToolbarRendererProps) {
  // Destructure fields available in Phase 2
  const {
    table,
    globalFilter,
    setGlobalFilter,
    density,
    setDensity,
    isRefetching,
    onRefresh,
    handleExpand,
    mode,
    features,
  } = useDataGridContext()

  // executeApiNode and onSearch are added to context in Phase 3.
  // Access them via a safe type cast so this file compiles in Phase 2 too.
  const futureCtx = useDataGridContext() as ReturnType<typeof useDataGridContext> & FutureContext
  const executeApiNode = futureCtx.executeApiNode ?? ((_id: string) => Promise.resolve())
  const onSearch = futureCtx.onSearch

  const ctx = useMemo<ToolbarContext>(
    () => ({
      table,
      rows: table.getFilteredRowModel().rows.map((r) => r.original as GridRow),
      allRows: table.getCoreRowModel().rows.map((r) => r.original as GridRow),
      selectedRows: table
        .getSelectedRowModel()
        .rows.map((r) => r.original as GridRow),
      globalFilter,
      setGlobalFilter,
      density,
      setDensity,
      isRefetching,
      executeApiNode,
      refetch: onRefresh,
      expandRow: (row) => handleExpand(row as unknown as Row<GridRow>),
      collapseAll: () => table.toggleAllRowsExpanded(false),
      onSearch,
      mode,
      features,
    }),
    [
      table,
      globalFilter,
      setGlobalFilter,
      density,
      setDensity,
      isRefetching,
      executeApiNode,
      onRefresh,
      handleExpand,
      onSearch,
      mode,
      features,
    ],
  )

  const enabledCommands = commands.filter((c) => c.enabled === true)

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md',
        className,
      )}
    >
      {enabledCommands.map((command) => renderCommand(command, ctx))}
    </div>
  )
})

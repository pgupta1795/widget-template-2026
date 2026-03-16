# Toolbar System — Phase 2: Command Renderers

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four renderer components and the main `ToolbarRenderer`. These are pure presentational components — they receive `ToolbarCommand` + `ToolbarContext` and render shadcn/ui primitives.

**Architecture:** Each generic command type (`command`, `menu`, `search`) gets its own focused file. `toolbar-renderer.tsx` is the orchestrator — it reads from `DataGridContext`, builds `ToolbarContext`, handles built-in IDs with special rendering, and delegates generic types to the sub-components.

**Tech Stack:** React 19, shadcn/ui (Button, DropdownMenu, Input, Separator, Popover, Checkbox), lucide-react, Tailwind CSS v4, `cn()` from `@/lib/utils`

**Prerequisites:** Phase 1 complete (`toolbar/toolbar.types.ts`, `icon-resolver.ts`, `toolbar-defaults.ts`, `merge-toolbar-commands.ts` all exist).

**Spec:** `docs/superpowers/specs/2026-03-16-toolbar-customization-design.md`

---

## Chunk 1: Generic Command Components

### Task 1: command-search.tsx

**Files:**
- Create: `src/components/data-grid/toolbar/command-search.tsx`

This component handles `type: 'search'`. It renders a debounced input. When `apiNodeId` is set it calls `ctx.onSearch(paramName, value)` (server-side). Otherwise it calls `ctx.setGlobalFilter(value)` (client-side).

- [ ] **Step 1: Create the file**

```tsx
// src/components/data-grid/toolbar/command-search.tsx
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandSearchProps {
  command: ToolbarCommand
  ctx: ToolbarContext
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function CommandSearch({ command, ctx }: CommandSearchProps) {
  const isServerSide = Boolean(command.apiNodeId)
  const debounceMs = command.debounceMs ?? 300
  const paramName = command.queryParamName ?? 'q'

  // For client-side: sync with globalFilter as the source of truth
  // For server-side: manage local state independently
  const [localValue, setLocalValue] = useState(
    isServerSide ? '' : ctx.globalFilter,
  )

  // Keep client-side input in sync when globalFilter changes externally
  useEffect(() => {
    if (!isServerSide) {
      setLocalValue(ctx.globalFilter)
    }
  }, [ctx.globalFilter, isServerSide])

  const debouncedValue = useDebounce(localValue, isServerSide ? debounceMs : 0)

  // Fire the search action when debounced value changes
  useEffect(() => {
    if (isServerSide) {
      ctx.onSearch?.(paramName, debouncedValue)
    } else {
      ctx.setGlobalFilter(debouncedValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue])

  const handleClear = () => {
    setLocalValue('')
    if (isServerSide) {
      ctx.onSearch?.(paramName, '')
    } else {
      ctx.setGlobalFilter('')
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={command.placeholder ?? 'Search...'}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={cn(
          'h-8 w-56 pl-8 text-sm transition-[width] duration-200 focus:w-72',
          command.inputClassName,
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript — no errors in this file**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
npx tsc --noEmit 2>&1 | grep "command-search" | head -10
```

Expected: no output (no errors).

---

### Task 2: command-button.tsx

**Files:**
- Create: `src/components/data-grid/toolbar/command-button.tsx`

Handles generic `type: 'command'`. Disables itself while the async handler is running.

- [ ] **Step 1: Create the file**

```tsx
// src/components/data-grid/toolbar/command-button.tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCallback, useState } from 'react'
import { resolveLucideIcon } from './icon-resolver'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandButtonProps {
  command: ToolbarCommand
  ctx: ToolbarContext
}

export function CommandButton({ command, ctx }: CommandButtonProps) {
  const [isPending, setIsPending] = useState(false)

  const handleClick = useCallback(async () => {
    if (!command.handler) return
    setIsPending(true)
    try {
      await command.handler(ctx, command.handlerParams)
    } finally {
      setIsPending(false)
    }
  }, [command, ctx])

  const Icon =
    command.icon != null
      ? typeof command.icon === 'string'
        ? resolveLucideIcon(command.icon)
        : command.icon
      : null

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8 gap-1.5', command.className)}
      onClick={handleClick}
      disabled={command.disabled === true || isPending}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {command.label && <span className="text-xs">{command.label}</span>}
    </Button>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "command-button" | head -10
```

Expected: no output.

---

### Task 3: command-menu.tsx

**Files:**
- Create: `src/components/data-grid/toolbar/command-menu.tsx`

Handles generic `type: 'menu'`. Items in `commands[]` are always flat (`DropdownMenuItem`). Menu items that have their own `handler` call it; items without handlers do nothing.

- [ ] **Step 1: Create the file**

```tsx
// src/components/data-grid/toolbar/command-menu.tsx
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { resolveLucideIcon } from './icon-resolver'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandMenuProps {
  command: ToolbarCommand
  ctx: ToolbarContext
}

export function CommandMenu({ command, ctx }: CommandMenuProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleItemClick = async (item: ToolbarCommand) => {
    if (!item.handler) return
    setPendingId(item.id)
    try {
      await item.handler(ctx, item.handlerParams)
    } finally {
      setPendingId(null)
    }
  }

  const TriggerIcon =
    command.icon != null
      ? typeof command.icon === 'string'
        ? resolveLucideIcon(command.icon)
        : command.icon
      : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1.5', command.className)}
          disabled={command.disabled}
        >
          {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5" />}
          {command.label && <span className="text-xs">{command.label}</span>}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={command.menuClassName}>
        <DropdownMenuGroup>
          {(command.commands ?? []).map((item) => {
            const ItemIcon =
              item.icon != null
                ? typeof item.icon === 'string'
                  ? resolveLucideIcon(item.icon)
                  : item.icon
                : null
            const isItemPending = pendingId === item.id
            return (
              <DropdownMenuItem
                key={item.id}
                disabled={item.disabled === true || isItemPending}
                onClick={() => handleItemClick(item)}
                className={item.className}
              >
                {ItemIcon && <ItemIcon className="mr-2 h-3.5 w-3.5" />}
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "command-menu" | head -10
```

Expected: no output.

---

## Chunk 2: Main Toolbar Renderer

### Task 4: toolbar-renderer.tsx

**Files:**
- Create: `src/components/data-grid/toolbar/toolbar-renderer.tsx`

This is the main component. It:
1. Reads from `DataGridContext` and constructs `ToolbarContext`
2. Filters `enabled: true` commands
3. For built-in IDs (`columnVisibility`, `density`, `expandAll`, `refresh`, `export`, `addRow`) renders dedicated sub-components
4. For generic types delegates to `CommandButton`, `CommandMenu`, `CommandSearch`

- [ ] **Step 1: Create the file**

```tsx
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
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: cn('h-8 gap-1.5', command.className),
        })}
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
        className={buttonVariants({
          variant: 'ghost',
          size: 'icon',
          className: cn('h-8 w-8', command.className),
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
      expandRow: (row) => handleExpand(row as Row<GridRow>),
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
```

- [ ] **Step 2: Verify TypeScript — no errors in toolbar/ files**

```bash
npx tsc --noEmit 2>&1 | grep "data-grid/toolbar" | head -20
```

Expected: no errors. Fix any that appear before proceeding.

**Note on `executeApiNode` and `onSearch` fields:** These are added to `DataGridContextValue` in Phase 3. The code above uses a `FutureContext` type cast to access them safely without TypeScript errors. No placeholders or `@ts-expect-error` comments are needed. In Phase 3 (Task 5, Step 3), these two calls to `useDataGridContext()` can be collapsed back into a single destructure once the context has both fields.

- [ ] **Step 3: Update barrel index to export renderer and sub-components**

Add to `src/components/data-grid/toolbar/index.ts`:

```typescript
// Renderers (add after existing exports)
export { ToolbarRenderer } from './toolbar-renderer'
export { CommandButton } from './command-button'
export { CommandMenu } from './command-menu'
export { CommandSearch } from './command-search'
```

- [ ] **Step 4: Run TypeScript check again**

```bash
npx tsc --noEmit 2>&1 | grep "data-grid/toolbar" | head -20
```

Expected: no errors in toolbar/ files.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/toolbar/
git commit -m "feat: toolbar phase 2 — command renderers and ToolbarRenderer"
```

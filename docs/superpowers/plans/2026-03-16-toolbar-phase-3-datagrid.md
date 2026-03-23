# Toolbar System — Phase 3: DataGrid Integration

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the toolbar system into the DataGrid. Remove old toolbar slots, add new props to `DataGridProps`, thread `onAction`/`onSearch` through `useDataGrid` into context, and replace the monolithic `data-grid-toolbar.tsx` with the new slim version that delegates to `ToolbarRenderer`.

**Architecture:** Surgical modifications to 4 existing files. The changes are additive on `DataGridProps` (new props) and subtractive on `GridSlots` (remove 3 toolbar-specific slots). `use-data-grid.ts` threads the new props into context. `data-grid-toolbar.tsx` becomes a thin wrapper.

**Tech Stack:** React 19, TanStack Table v8, shadcn/ui

**Prerequisites:** Phase 1 and Phase 2 complete.

**Spec:** `docs/superpowers/specs/2026-03-16-toolbar-customization-design.md`

---

## Chunk 1: Types & Context

### Task 1: Remove toolbar slots from GridSlots

**Files:**
- Modify: `src/components/data-grid/types/slot-types.ts`

`GridSlots` currently has `toolbar?`, `toolbarLeft?`, `toolbarRight?`. These are replaced by the `toolbarCommands` prop on `DataGrid`. Remove them; keep `selectionActions`, `emptyState`, `loadingState`.

- [ ] **Step 1: Read the current file**

Read `src/components/data-grid/types/slot-types.ts` to confirm current shape.

- [ ] **Step 2: Update the file**

```typescript
// src/components/data-grid/types/slot-types.ts
import type { GridRow } from './grid-types'

export interface GridSlots {
  selectionActions?: (selectedRows: GridRow[]) => React.ReactNode
  emptyState?: React.ReactNode
  loadingState?: React.ReactNode
}
```

Note: `ToolbarSlotProps` is no longer needed — remove it. The `toolbar`, `toolbarLeft`, `toolbarRight` fields and the `import type { Table }` line are all deleted (Table was only used by ToolbarSlotProps).

- [ ] **Step 3: Check for usages of the removed fields**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
grep -r "slots\.toolbar\b\|slots\.toolbarLeft\|slots\.toolbarRight\|toolbarLeft\|toolbarRight\|ToolbarSlotProps" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
```

Expected output: any files still referencing the removed fields. Fix each one:
- In `data-grid-toolbar.tsx`: the old `slots?.toolbarLeft` and `slots?.toolbarRight` usages — these get removed in Task 4 when we rewrite that file.
- In `data-grid.tsx`: the `slots` prop passes through — no change needed there since slot fields were just removed.
- Anywhere else: remove the usage.

- [ ] **Step 4: Remove `ToolbarSlotProps` re-export from `src/components/data-grid/types/index.ts`**

Open `src/components/data-grid/types/index.ts`. Find and delete any line that re-exports `ToolbarSlotProps`, e.g.:

```typescript
// DELETE this line (exact text may vary):
export type { ToolbarSlotProps } from './slot-types'
```

Run TypeScript check to confirm no consumers are broken:

```bash
npx tsc --noEmit 2>&1 | grep "ToolbarSlotProps" | head -10
```

Expected: no errors. If any consumer imported `ToolbarSlotProps`, remove that import too.

---

### Task 2: Update DataGridContextValue

**Files:**
- Modify: `src/components/data-grid/data-grid-context.tsx`

Add `toolbarCommands?`, `toolbarClassName?`, `executeApiNode`, `onSearch?` to the context interface.

- [ ] **Step 1: Read the current file**

Read `src/components/data-grid/data-grid-context.tsx` to understand the current interface.

- [ ] **Step 2: Update `DataGridContextValue`**

Add these fields to the `DataGridContextValue` interface after the existing `onRefresh?` field:

```typescript
// Add these imports at the top of data-grid-context.tsx:
import type { ToolbarCommand } from '@/components/data-grid/toolbar/toolbar.types'

// Add to DataGridContextValue interface:
  toolbarCommands?: ToolbarCommand[]
  toolbarClassName?: string
  /** Fires a DAG action by id. No-op when DataGrid is standalone (no onAction prop). */
  executeApiNode: (actionId: string) => Promise<void>
  /** Server-side search relay. Undefined when DataGrid has no onSearch prop wired. */
  onSearch?: (paramName: string, query: string) => void
```

The full updated interface will look like:

```typescript
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
  // New toolbar fields
  toolbarCommands?: ToolbarCommand[]
  toolbarClassName?: string
  executeApiNode: (actionId: string) => Promise<void>
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
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginatedTotal: number | undefined
  // Infinite
  hasNextPage: boolean
  fetchNextPage: () => void
}
```

- [ ] **Step 3: Verify TypeScript on context file**

```bash
npx tsc --noEmit 2>&1 | grep "data-grid-context" | head -10
```

Expected: no errors.

---

## Chunk 2: Hook & Props

### Task 3: Update use-data-grid.ts

**Files:**
- Modify: `src/components/data-grid/hooks/use-data-grid.ts`

Add `toolbarCommands?`, `toolbarClassName?`, `onAction?`, `onSearch?` to `DataGridConfig`. Thread them into the returned `DataGridContextValue`. Construct `executeApiNode` as a `useCallback` wrapper around `onAction`.

- [ ] **Step 1: Read the current file**

Read `src/components/data-grid/hooks/use-data-grid.ts` to understand current destructuring and return shape.

- [ ] **Step 2: Add new fields to DataGridConfig**

Add after the existing `onRefresh?` field in the `DataGridConfig` interface:

```typescript
  /** Toolbar command definitions. undefined = no toolbar rendered. */
  toolbarCommands?: ToolbarCommand[]
  /** CSS classes for the toolbar bar element */
  toolbarClassName?: string
  /**
   * Fires a DAG ActionDef by id. Signature matches useDAGTable's onAction return.
   * At toolbar level row is always undefined.
   */
  onAction?: (actionId: string, row?: GridRow) => Promise<void>
  /** Server-side search callback. Wired by ConfiguredTable to update searchParams state. */
  onSearch?: (paramName: string, query: string) => void
```

Also add the import at the top:

```typescript
import type { ToolbarCommand } from '@/components/data-grid/toolbar/toolbar.types'
```

- [ ] **Step 3: Destructure new fields and build executeApiNode**

In the `useDataGrid` function body, after the existing destructuring of `config`:

```typescript
const {
  // ...existing destructuring...
  onRefresh,
  toolbarCommands,
  toolbarClassName,
  onAction,
  onSearch,
  // ...rest...
} = config

// Build executeApiNode — always defined, falls back to no-op when onAction not wired
const executeApiNode = React.useCallback(
  (actionId: string) => onAction?.(actionId, undefined) ?? Promise.resolve(),
  [onAction],
)
```

- [ ] **Step 4: Add new fields to the returned useMemo**

Inside the `return React.useMemo<DataGridContextValue>(...)` call, add after `onRefresh`:

```typescript
      toolbarCommands,
      toolbarClassName,
      executeApiNode,
      onSearch,
```

Also add them to the `useMemo` dependency array:

```typescript
      toolbarCommands,
      toolbarClassName,
      executeApiNode,
      onSearch,
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "use-data-grid" | head -10
```

Expected: no errors.

---

### Task 4: Update DataGridProps and DataGrid component

**Files:**
- Modify: `src/components/data-grid/data-grid.tsx`

Add `toolbarCommands?`, `toolbarClassName?`, `onAction?`, `onSearch?` to `DataGridProps` and pass them through to `useDataGrid`.

- [ ] **Step 1: Read the current file**

Read `src/components/data-grid/data-grid.tsx` to find the `DataGridProps` interface and the `DataGrid` function.

- [ ] **Step 2: Add to DataGridProps interface**

Add after the existing `initialColumnVisibility?` field:

```typescript
  /**
   * Toolbar command definitions.
   * - undefined: no toolbar bar rendered
   * - []: empty toolbar bar (height preserved)
   * - [...]: render only enabled:true commands
   */
  toolbarCommands?: ToolbarCommand[]
  /** CSS classes merged onto the toolbar bar element only (not SelectionActionBar) */
  toolbarClassName?: string
  /**
   * Fires a DAG ActionDef by id. Provided by ConfiguredTable from useDAGTable.
   * Toolbar handlers call ctx.executeApiNode(actionId) which wraps this.
   */
  onAction?: (actionId: string, row?: GridRow) => Promise<void>
  /**
   * Server-side search callback. Called by search commands when apiNodeId is set.
   * Signature: (paramName, query) — paramName defaults to 'q'.
   */
  onSearch?: (paramName: string, query: string) => void
```

Also add the import at the top:

```typescript
import type { ToolbarCommand } from '@/components/data-grid/toolbar/toolbar.types'
```

- [ ] **Step 3: Pass new props to useDataGrid**

In the `DataGrid` function body, `useDataGrid(props)` already passes the entire `props` object — since `DataGridConfig` now includes the new fields, they will be automatically forwarded. No change needed here.

- [ ] **Step 4: Remove legacy `slots?.toolbar` conditional from `DataGridInner`**

Search for the `slots?.toolbar` usage inside `data-grid.tsx`:

```bash
grep -n "slots?.toolbar\|slots\.toolbar" src/components/data-grid/data-grid.tsx
```

Find the conditional that renders the old toolbar slot. It will look something like:

```tsx
{slots?.toolbar ? slots.toolbar({ table }) : <DataGridToolbar />}
```

Replace it with the unconditional render:

```tsx
<DataGridToolbar />
```

The new `DataGridToolbar` reads `toolbarCommands` from context internally — no slot needed.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "data-grid\.tsx" | head -10
```

Expected: no errors.

---

## Chunk 3: Toolbar Component

### Task 5: Rewrite data-grid-toolbar.tsx

**Files:**
- Modify: `src/components/data-grid/data-grid-toolbar.tsx`

Replace the monolithic file with a slim version. `SelectionActionBar` and `ActiveFiltersBadge` remain as static built-ins. The main `DataGridToolbar` renders them plus the new `ToolbarRenderer` (only when `toolbarCommands` is not undefined).

- [ ] **Step 1: Read the current file**

Read `src/components/data-grid/data-grid-toolbar.tsx` to see all current components. The following will be removed:
- `SearchInput` (replaced by `CommandSearch` in Phase 2)
- `ColumnVisibilityToggle` (replaced by `BuiltInColumnVisibility` in Phase 2)
- `DensityControl` (replaced by `BuiltInDensity` in Phase 2)
- `ExpandAllControl` (replaced by `BuiltInExpandAll` in Phase 2)
- `RefreshButton` (replaced by `BuiltInRefresh` in Phase 2)
- `ExportButton` (replaced by `BuiltInExport` in Phase 2)
- `AddRowButton` (replaced by `BuiltInAddRow` in Phase 2)

These are kept:
- `ActiveFiltersBadge` (static, no change)
- `SelectionActionBar` (static, no change)

- [ ] **Step 2: Rewrite the file**

```tsx
// src/components/data-grid/data-grid-toolbar.tsx
import type { GridColumnDef } from '@/components/data-grid/types/column-types'
import { exportToCsv } from '@/components/data-grid/utils/csv-export'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
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
```

- [ ] **Step 3: Collapse FutureContext cast in toolbar-renderer.tsx**

Open `src/components/data-grid/toolbar/toolbar-renderer.tsx`. Find the two calls to `useDataGridContext()` — one for the main destructure, one for the `FutureContext` cast. Now that `DataGridContextValue` has `executeApiNode` and `onSearch`, merge them into a single destructure and remove the `FutureContext` type and the second `useDataGridContext()` call:

```tsx
// Remove the FutureContext type definition and the second useDataGridContext() call.
// Replace with a single destructure:
const {
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
} = useDataGridContext()
```

- [ ] **Step 4: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "src/main.tsx\|src/app/services\|openApiParser" | head -30
```

Expected: no errors in the data-grid files.

- [ ] **Step 5: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes without errors.

- [ ] **Step 6: Run all toolbar tests**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/data-grid/
git commit -m "feat: toolbar phase 3 — DataGrid integration, context wiring, slim toolbar"
```
